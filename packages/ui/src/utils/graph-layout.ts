import * as d3 from "d3";
import type { SimulationLink, SimulationNode } from "../types/ui.js";

export function createSimulation(
  nodes: SimulationNode[],
  links: SimulationLink[],
  width: number,
  height: number,
): d3.Simulation<SimulationNode, SimulationLink> {
  return d3
    .forceSimulation<SimulationNode>(nodes)
    .force(
      "link",
      d3
        .forceLink<SimulationNode, SimulationLink>(links)
        .id((d) => d.id)
        .distance((link) => {
          if (link.type === "contains") {
            return 40;
          }
          if (link.type === "import") {
            return 120;
          }
          return 80;
        })
        .strength((link) => {
          if (link.type === "contains") {
            return 0.8;
          }
          if (link.type === "import") {
            return 0.4;
          }
          return 0.2;
        }),
    )
    .force("charge", d3.forceManyBody<SimulationNode>().strength(-120).distanceMax(300))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(0.05))
    .force(
      "collision",
      d3.forceCollide<SimulationNode>().radius((d) => (d.type === "file" ? 20 : 12)).strength(0.7),
    )
    .force("cluster-spacing", createFileClusterSpacingForce(links))
    .alphaDecay(0.02)
    .velocityDecay(0.36);
}

function createFileClusterSpacingForce(
  links: SimulationLink[],
): d3.Force<SimulationNode, SimulationLink> {
  let nodes: SimulationNode[] = [];
  let clusters: string[][] = [];

  const force = (alpha: number): void => {
    const nodeById = new Map(nodes.map((node) => [node.id, node]));
    const drafts = clusters
      .map((clusterNodeIds) => {
        const members = clusterNodeIds
          .map((id) => nodeById.get(id))
          .filter((node): node is SimulationNode => Boolean(node));
        if (members.length === 0) {
          return null;
        }

        const center = members.reduce(
          (acc, node) => ({
            x: acc.x + (node.x ?? 0),
            y: acc.y + (node.y ?? 0),
          }),
          { x: 0, y: 0 },
        );
        center.x /= members.length;
        center.y /= members.length;

        const maxDistance = members.reduce((max, node) => {
          const dx = (node.x ?? center.x) - center.x;
          const dy = (node.y ?? center.y) - center.y;
          return Math.max(max, Math.hypot(dx, dy));
        }, 0);

        return {
          members,
          center,
          radius: Math.max(34, maxDistance + 34),
        };
      })
      .filter(
        (
          draft,
        ): draft is {
          members: SimulationNode[];
          center: { x: number; y: number };
          radius: number;
        } => Boolean(draft),
      );

    const gap = 14;
    for (let i = 0; i < drafts.length; i += 1) {
      for (let j = i + 1; j < drafts.length; j += 1) {
        const a = drafts[i];
        const b = drafts[j];
        if (!a || !b) {
          continue;
        }

        let dx = a.center.x - b.center.x;
        let dy = a.center.y - b.center.y;
        let distance = Math.hypot(dx, dy);
        if (distance < 0.001) {
          const angle = (i + j + 1) * 1.618;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          distance = 1;
        }

        const overlap = a.radius + b.radius + gap - distance;
        if (overlap <= 0) {
          continue;
        }

        const nx = dx / distance;
        const ny = dy / distance;
        const totalRadius = a.radius + b.radius;
        const aShare = b.radius / totalRadius;
        const bShare = a.radius / totalRadius;
        const strength = Math.min(0.42, 0.2 + alpha * 0.55);
        const moveA = overlap * aShare * strength;
        const moveB = overlap * bShare * strength;

        for (const node of a.members) {
          node.vx = (node.vx ?? 0) + nx * moveA;
          node.vy = (node.vy ?? 0) + ny * moveA;
        }
        for (const node of b.members) {
          node.vx = (node.vx ?? 0) - nx * moveB;
          node.vy = (node.vy ?? 0) - ny * moveB;
        }
      }
    }
  };

  force.initialize = (simulationNodes: SimulationNode[]): void => {
    nodes = simulationNodes;
    clusters = buildFileClusters(links);
  };

  return force;
}

function buildFileClusters(links: SimulationLink[]): string[][] {
  const clusterMap = new Map<string, string[]>();
  for (const link of links) {
    if (link.type !== "contains") {
      continue;
    }

    const sourceId = getNodeId(link.source);
    const targetId = getNodeId(link.target);
    if (!sourceId || !targetId) {
      continue;
    }

    const members = clusterMap.get(sourceId) ?? [sourceId];
    members.push(targetId);
    clusterMap.set(sourceId, members);
  }

  return [...clusterMap.values()].filter((members) => members.length > 1);
}

function getNodeId(node: SimulationNode | string): string | null {
  return typeof node === "string" ? node : node.id;
}
