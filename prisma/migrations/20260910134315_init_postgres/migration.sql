-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "conditionType" TEXT NOT NULL,
    "conditionValue" TEXT NOT NULL,
    "assignmentMode" TEXT NOT NULL DEFAULT 'SINGLE',
    "rotationIndex" INTEGER NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Promotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gift" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GwpOrderLog" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "giftId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GwpOrderLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Promotion_shop_idx" ON "Promotion"("shop");

-- CreateIndex
CREATE INDEX "Promotion_shop_active_idx" ON "Promotion"("shop", "active");

-- CreateIndex
CREATE INDEX "Gift_shop_idx" ON "Gift"("shop");

-- CreateIndex
CREATE INDEX "Gift_promotionId_idx" ON "Gift"("promotionId");

-- CreateIndex
CREATE INDEX "Gift_inventoryItemId_idx" ON "Gift"("inventoryItemId");

-- CreateIndex
CREATE INDEX "GwpOrderLog_shop_idx" ON "GwpOrderLog"("shop");

-- CreateIndex
CREATE INDEX "GwpOrderLog_shop_createdAt_idx" ON "GwpOrderLog"("shop", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GwpOrderLog_orderId_promotionId_variantId_key" ON "GwpOrderLog"("orderId", "promotionId", "variantId");

-- AddForeignKey
ALTER TABLE "Gift" ADD CONSTRAINT "Gift_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GwpOrderLog" ADD CONSTRAINT "GwpOrderLog_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
