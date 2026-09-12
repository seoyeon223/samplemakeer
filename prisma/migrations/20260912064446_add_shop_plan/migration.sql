-- CreateTable
CREATE TABLE "Shop" (
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'Free',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("shop")
);
