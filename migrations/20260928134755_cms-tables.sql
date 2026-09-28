-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'ca',
    "title" VARCHAR(200) NOT NULL,
    "seo" JSONB NOT NULL DEFAULT '{}',
    "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "updatedBy" VARCHAR(100),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageBlock" (
    "id" SERIAL NOT NULL,
    "pageId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" VARCHAR(30) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "PageBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fare" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(60) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "priceCents" INTEGER,
    "unit" VARCHAR(40) NOT NULL DEFAULT '',
    "conditions" VARCHAR(1000) NOT NULL DEFAULT '',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Fare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Discount" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "percentage" INTEGER NOT NULL,
    "appliesTo" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Discount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" SERIAL NOT NULL,
    "icon" VARCHAR(40) NOT NULL DEFAULT '',
    "name" VARCHAR(120) NOT NULL,
    "description" VARCHAR(1000) NOT NULL DEFAULT '',
    "channels" JSONB NOT NULL DEFAULT '[]',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stat" (
    "id" SERIAL NOT NULL,
    "label" VARCHAR(120) NOT NULL,
    "value" VARCHAR(40) NOT NULL,
    "unit" VARCHAR(20) NOT NULL DEFAULT '',
    "icon" VARCHAR(40) NOT NULL DEFAULT '',
    "group" VARCHAR(40) NOT NULL DEFAULT 'general',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleGroup" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "icon" VARCHAR(40) NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RuleGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "text" VARCHAR(500) NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "icon" VARCHAR(40) NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" SERIAL NOT NULL,
    "r2Key" VARCHAR(300) NOT NULL,
    "alt" VARCHAR(300) NOT NULL DEFAULT '',
    "width" INTEGER,
    "height" INTEGER,
    "mime" VARCHAR(100) NOT NULL DEFAULT '',
    "size" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Redirect" (
    "id" SERIAL NOT NULL,
    "fromPath" VARCHAR(300) NOT NULL,
    "toPath" VARCHAR(300) NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Redirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Faq" (
    "id" SERIAL NOT NULL,
    "locale" VARCHAR(5) NOT NULL DEFAULT 'ca',
    "question" VARCHAR(300) NOT NULL,
    "answer" VARCHAR(2000) NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Page_status_idx" ON "Page"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_locale_key" ON "Page"("slug", "locale");

-- CreateIndex
CREATE INDEX "PageBlock_pageId_idx" ON "PageBlock"("pageId");

-- CreateIndex
CREATE INDEX "Fare_category_idx" ON "Fare"("category");

-- CreateIndex
CREATE INDEX "Fare_status_idx" ON "Fare"("status");

-- CreateIndex
CREATE INDEX "Stat_group_idx" ON "Stat"("group");

-- CreateIndex
CREATE INDEX "Rule_groupId_idx" ON "Rule"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "Media_r2Key_key" ON "Media"("r2Key");

-- CreateIndex
CREATE UNIQUE INDEX "Redirect_fromPath_key" ON "Redirect"("fromPath");

-- CreateIndex
CREATE INDEX "Faq_locale_idx" ON "Faq"("locale");

-- AddForeignKey
ALTER TABLE "PageBlock" ADD CONSTRAINT "PageBlock_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rule" ADD CONSTRAINT "Rule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "RuleGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Server-only tables: no anon/authenticated access.
ALTER TABLE public."Page" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PageBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Fare" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Discount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Stat" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RuleGroup" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Rule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Media" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Redirect" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Faq" ENABLE ROW LEVEL SECURITY;
