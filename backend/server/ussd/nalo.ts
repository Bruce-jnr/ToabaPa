import { z } from 'zod';

export const naloRequestSchema = z.object({
  SESSIONID: z.string().min(1).max(100),
  USERID: z.string().min(1).max(100),
  MSGTYPE: z.boolean(),
  MSISDN: z.string().min(7).max(20),
  USERDATA: z.string().max(120),
  NETWORK: z.string().min(1).max(50),
});
export type NaloRequest = z.infer<typeof naloRequestSchema>;

export function naloResponse(
  request: NaloRequest,
  message: string,
  continueSession: boolean,
) {
  return {
    SESSIONID: request.SESSIONID,
    USERID: request.USERID,
    MSISDN: request.MSISDN,
    USERDATA: request.USERDATA,
    MSG: message,
    MSGTYPE: continueSession,
  };
}
