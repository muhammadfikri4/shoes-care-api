-- Migration: Remove PaymentStatus enum and payment_status column
-- This migration simplifies the transaction status by using only TransactionStatus

-- Step 1: Drop the payment_status column from transactions table
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "payment_status";

-- Step 2: Drop the PaymentStatus enum type
DROP TYPE IF EXISTS "PaymentStatus";

-- Notes:
-- - The `status` column (TransactionStatus) is now the single source of truth for transaction state
-- - CREATED status indicates waiting for payment (for QRIS/TRANSFER)
-- - IN_PROGRESS status indicates payment received and work in progress
-- - READY_TO_PICKUP status indicates work completed and ready for pickup
-- - COMPLETED status indicates customer has picked up the order
-- - CANCELLED status indicates payment failed or transaction cancelled
--
-- - Payment tracking still available via:
--   * paidAt: timestamp when payment was received
--   * paymentMethod: method used (CASH, QRIS, TRANSFER)
--   * cashPaid/cashChange: for cash payments
--   * midtransToken/midtransRedirectUrl: for online payments
