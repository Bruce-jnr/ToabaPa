import {
  PaymentProviderName,
  PaymentStatus,
  VoteChannel,
} from '@prisma/client';
import { prisma } from '../db/prisma.js';
import { AppError } from '../errors/app-error.js';
import { normalizeGhanaPhone } from '../domain/phone.js';
import { paystackProvider } from '../payments/paystack.provider.js';
import { createVoteOrder } from '../services/vote-order.service.js';
import { creditVerifiedPayment } from '../services/vote-credit.service.js';
import type { NaloRequest } from './nalo.js';
import {
  hasAmbiguousLiveCode,
  liveUssdCandidateFilter,
} from './candidate-resolution.js';
import {
  deleteUssdSession,
  getUssdSession,
  saveUssdSession,
} from './session-store.js';
function providerFor(network: string): 'mtn' | 'atl' | 'vod' {
  const value = network.toLowerCase();
  if (value.includes('mtn')) return 'mtn';
  if (
    value.includes('airtel') ||
    value.includes('tigo') ||
    value.includes('at ')
  )
    return 'atl';
  if (value.includes('vod') || value.includes('telecel')) return 'vod';
  throw new AppError(
    400,
    'UNSUPPORTED_MOMO_NETWORK',
    'Your mobile money network is not supported.',
  );
}

export async function handleUssd(
  request: NaloRequest,
): Promise<{ message: string; continueSession: boolean }> {
  const phone = normalizeGhanaPhone(request.MSISDN);
  if (request.MSGTYPE) {
    await saveUssdSession(request.SESSIONID, {
      step: 'MAIN_MENU',
      phone,
      userId: request.USERID,
      network: request.NETWORK,
    });
    return {
      message: 'Welcome to Toabapa\n1. Vote\n0. Exit',
      continueSession: true,
    };
  }
  const session = await getUssdSession(request.SESSIONID);
  if (!session) {
    return {
      message: 'Session expired. Try Again',
      continueSession: false,
    };
  }
  let sameNetwork = false;
  try {
    sameNetwork = providerFor(session.network) === providerFor(request.NETWORK);
  } catch {
    sameNetwork = false;
  }
  if (
    session.phone !== phone ||
    session.userId !== request.USERID ||
    !sameNetwork
  ) {
    await deleteUssdSession(request.SESSIONID);
    throw new AppError(
      400,
      'USSD_SESSION_MISMATCH',
      'Session details changed. Start again.',
    );
  }
  const input = request.USERDATA.trim();
  if (session.step === 'MAIN_MENU') {
    if (input !== '1') {
      await deleteUssdSession(request.SESSIONID);
      return {
        message:
          input === '0' ? 'Thank you for using Toabapa.' : 'Invalid option.',
        continueSession: false,
      };
    }
    await saveUssdSession(request.SESSIONID, {
      ...session,
      step: 'ENTER_CODE',
    });
    return { message: 'Enter nominee code:', continueSession: true };
  }
  if (session.step === 'ENTER_CODE') {
    const candidates = await prisma.candidate.findMany({
      where: liveUssdCandidateFilter(input),
      include: { event: true, category: true },
      take: 2,
    });
    if (hasAmbiguousLiveCode(candidates)) {
      await deleteUssdSession(request.SESSIONID);
      return {
        message:
          'This nominee code is used by more than one live event. Contact the event organizer for the correct code.',
        continueSession: false,
      };
    }
    const candidate = candidates[0];
    if (!candidate)
      return {
        message:
          'Nominee code is not valid for a live event. Enter nominee code:',
        continueSession: true,
      };
    await saveUssdSession(request.SESSIONID, {
      ...session,
      step: 'ENTER_QUANTITY',
      candidateId: candidate.id,
      candidateName: candidate.name,
      categoryName: candidate.category.name,
    });
    return {
      message: `${candidate.name}\n${candidate.category.name}\nEnter number of votes:`,
      continueSession: true,
    };
  }
  if (session.step === 'ENTER_QUANTITY') {
    const quantity = Number(input);
    if (!Number.isSafeInteger(quantity) || quantity < 1)
      return {
        message: 'Enter a valid number of votes:',
        continueSession: true,
      };
    const candidate = await prisma.candidate.findUnique({
      where: { id: session.candidateId! },
      include: { event: true, category: true },
    });
    if (!candidate)
      return {
        message: 'Nominee is no longer available.',
        continueSession: false,
      };
    const unitPrice =
      candidate.category.votePriceOverride ?? candidate.event.defaultVotePrice;
    const amount = quantity * unitPrice;
    await saveUssdSession(request.SESSIONID, {
      ...session,
      step: 'CONFIRM_ORDER',
      quantity,
      amount,
    });
    return {
      message: `${session.candidateName}\n${quantity} vote${quantity === 1 ? '' : 's'}\nTotal: ${candidate.event.currency} ${(amount / 100).toFixed(2)}\n1. Accept\n2. Cancel`,
      continueSession: true,
    };
  }
  if (input !== '1') {
    await deleteUssdSession(request.SESSIONID);
    return { message: 'Vote cancelled.', continueSession: false };
  }
  const order = await createVoteOrder({
    candidateId: session.candidateId,
    quantity: session.quantity,
    phone,
  }, VoteChannel.USSD);
  const savedOrder = await prisma.voteOrder.findUniqueOrThrow({
    where: { id: order.id },
    include: { organization: { select: { email: true } } },
  });
  let charge;
  try {
    charge = await paystackProvider.initializeMobileMoney({
      reference: order.paymentReference,
      amount: order.amount,
      currency: order.currency,
      email: savedOrder.organization.email,
      phone,
      provider: providerFor(session.network),
    });
  } catch (error) {
    await prisma.voteOrder.update({
      where: { id: order.id },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
    throw error;
  }
  await prisma.voteOrder.update({
    where: { id: order.id },
    data: { paymentStatus: PaymentStatus.PROCESSING },
  });
  await deleteUssdSession(request.SESSIONID);
  if (charge.status === 'success') {
    const verified = await paystackProvider.verifyPayment(
      order.paymentReference,
    );
    await creditVerifiedPayment(PaymentProviderName.PAYSTACK, verified);
    return {
      message: `Payment confirmed. ${order.quantity} vote${order.quantity === 1 ? '' : 's'} credited to ${session.candidateName}.\nRef: ${order.paymentReference}`,
      continueSession: false,
    };
  }
  return {
    message: `${charge.displayText}\nEnter your Mobile Money PIN on the authorization prompt. Votes are credited after payment confirmation.\nRef: ${order.paymentReference}`,
    continueSession: false,
  };
}
