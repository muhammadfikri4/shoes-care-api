-- Migration: Simplify schema by removing PaymentStatus and RackStatus
-- This migration removes dual status tracking and simplifies the data model

-- Part 1: Remove PaymentStatus enum and payment_status column
-- ============================================================

-- Step 1: Drop the payment_status column from transactions table
ALTER TABLE "transactions" DROP COLUMN IF EXISTS "payment_status";

-- Step 2: Drop the PaymentStatus enum type
DROP TYPE IF EXISTS "PaymentStatus";

-- Notes on Transaction Status:
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

-- Part 2: Remove RackStatus enum and simplify Rack model
-- ============================================================

-- Step 3: Drop the status column from racks table
ALTER TABLE "racks" DROP COLUMN IF EXISTS "status";

-- Step 4: Drop the location column from racks table
ALTER TABLE "racks" DROP COLUMN IF EXISTS "location";

-- Step 5: Add description column to racks table (if not exists)
ALTER TABLE "racks" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Step 6: Drop the RackStatus enum type
DROP TYPE IF EXISTS "RackStatus";

-- Notes on Rack:
-- - Rack status tracking has been removed (AVAILABLE, OCCUPIED, MAINTENANCE)
-- - Location field has been removed
-- - Added description field for flexible rack information
-- - Rack availability is now tracked through transaction items relationship only

-- Part 3: Add promoId field to Transaction model
-- ============================================================

-- Step 7: Add promo_id column to transactions table (nullable FK to promos)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "promo_id" CHAR(36);

-- Step 8: Add foreign key constraint for promo_id
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_promo_id_fkey"
  FOREIGN KEY ("promo_id") REFERENCES "promos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 9: Create index for promo_id for better query performance
CREATE INDEX IF NOT EXISTS "transactions_promo_id_idx" ON "transactions"("promo_id");

-- Notes on Promo tracking:
-- - promo_id field stores reference to the promo used in the transaction
-- - When a valid promo code is applied, the promo ID is saved to track which promo was used
-- - This enables better reporting and analytics on promo usage
-- - The promoApplied boolean flag indicates if any promo was applied
-- - Foreign key is set to SET NULL on delete to preserve transaction history even if promo is deleted

-- Part 4: Add QR Code URL field to Transaction model
-- ============================================================

-- Step 10: Add qr_code_url column to transactions table (nullable)
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "qr_code_url" VARCHAR(512);

-- Notes on QR Code URL:
-- - qr_code_url stores the public URL of the QR code image uploaded to storage bucket
-- - QR code is generated on transaction creation and uploaded to S3/storage bucket
-- - Path format: transactions/qr-codes/{transaction_code}.png
-- - Email templates use this URL to display QR code image
-- - This approach is more efficient than embedding base64 in emails
