-- AlterTable
ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(30) NULL;

-- AlterTable
ALTER TABLE `transactions` ADD COLUMN `contributorEmail` VARCHAR(191) NULL,
    ADD COLUMN `contributorName` VARCHAR(191) NULL,
    ADD COLUMN `type` VARCHAR(50) NOT NULL DEFAULT 'One-Time Contribution';

