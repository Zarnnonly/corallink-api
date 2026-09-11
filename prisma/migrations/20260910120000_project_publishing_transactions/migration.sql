-- AlterTable
ALTER TABLE `projects` ADD COLUMN `aiAnalysis` JSON NULL,
    ADD COLUMN `area` DOUBLE NULL,
    ADD COLUMN `description` TEXT NULL,
    ADD COLUMN `duration` INTEGER NULL,
    ADD COLUMN `fragments` INTEGER NULL,
    ADD COLUMN `fundingTarget` DECIMAL(14, 2) NULL,
    ADD COLUMN `milestoneVersion` INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN `milestones` JSON NULL,
    ADD COLUMN `progressNote` TEXT NULL,
    ADD COLUMN `species` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `transactions` (
    `id` VARCHAR(36) NOT NULL,
    `investor_id` INTEGER NOT NULL,
    `project_id` INTEGER NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'Pending',
    `proof_file` VARCHAR(191) NULL,
    `idempotency_key` VARCHAR(100) NOT NULL,
    `review_note` TEXT NULL,
    `reviewed_by` INTEGER NULL,
    `reviewed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `transactions_idempotency_key_key`(`idempotency_key`),
    INDEX `transactions_investor_id_created_at_idx`(`investor_id`, `created_at`),
    INDEX `transactions_project_id_status_idx`(`project_id`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payment_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `bankName` VARCHAR(100) NOT NULL,
    `accountNumber` VARCHAR(100) NOT NULL,
    `accountHolder` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_investor_id_fkey` FOREIGN KEY (`investor_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

