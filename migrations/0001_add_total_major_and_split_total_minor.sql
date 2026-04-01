-- Add integer part of amount and convert existing total_minor from full minor units to cents.
ALTER TABLE transactions ADD COLUMN total_major INTEGER NOT NULL DEFAULT 0;

UPDATE transactions
SET total_major = total_minor / 100,
    total_minor = total_minor % 100;
