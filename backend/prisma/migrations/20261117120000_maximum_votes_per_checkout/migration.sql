UPDATE "Event"
SET "maximumVotesPerTransaction" = 10000,
    "minimumVotes" = LEAST("minimumVotes", 10000);
ALTER TABLE "Event" ALTER COLUMN "maximumVotesPerTransaction" SET DEFAULT 10000;
