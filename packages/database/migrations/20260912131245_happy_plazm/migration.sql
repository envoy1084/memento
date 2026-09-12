CREATE TABLE "ens_workflows" (
	"namespace" text,
	"id" text,
	"revision" integer NOT NULL,
	"valueCiphertext" text NOT NULL,
	CONSTRAINT "ens_workflows_pkey" PRIMARY KEY("namespace","id"),
	CONSTRAINT "ens_workflow_revision" CHECK ("revision" >= 0)
);
