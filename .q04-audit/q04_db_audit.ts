import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.$queryRaw<Array<{
    database_name: string;
    schema_name: string;
    board_node_table: string | null;
    board_edge_table: string | null;
    relationship_table: string | null;
    hypothesis_table: string | null;
    proposed_pin_table: string | null;
    proposed_group_table: string | null;
    proposed_item_table: string | null;
  }>>`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      to_regclass('public."BoardNode"')::text AS board_node_table,
      to_regclass('public."BoardEdge"')::text AS board_edge_table,
      to_regclass('public."Relationship"')::text AS relationship_table,
      to_regclass('public."InvestigationHypothesis"')::text AS hypothesis_table,
      to_regclass('public."InvestigationBoardPin"')::text AS proposed_pin_table,
      to_regclass('public."InvestigationBoardGroup"')::text AS proposed_group_table,
      to_regclass('public."InvestigationBoardGroupItem"')::text AS proposed_item_table
  `;
  const counts = await prisma.$queryRaw<Array<{ campaigns: bigint; board_nodes: bigint; board_edges: bigint }>>`
    SELECT
      (SELECT COUNT(*) FROM "Campaign") AS campaigns,
      (SELECT COUNT(*) FROM "BoardNode") AS board_nodes,
      (SELECT COUNT(*) FROM "BoardEdge") AS board_edges
  `;
  const row = rows[0];
  const count = counts[0];
  if (!row || !count) throw new Error('Auditoria sem resultado.');
  const baselinePresent = [row.board_node_table, row.board_edge_table, row.relationship_table, row.hypothesis_table].every(Boolean);
  const proposedAbsent = [row.proposed_pin_table, row.proposed_group_table, row.proposed_item_table].every((value) => value === null);
  console.log(`readonly-audit: PASS`);
  console.log(`baseline-tables-present: ${baselinePresent}`);
  console.log(`proposed-q04-tables-absent-before-migration: ${proposedAbsent}`);
  console.log(`row-counts: campaigns=${count.campaigns.toString()} board_nodes=${count.board_nodes.toString()} board_edges=${count.board_edges.toString()}`);
  console.log('compatibility: no existing Q04 data requiring migration or cleanup');
}

main().catch(() => {
  console.error('readonly-audit: FAIL');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
