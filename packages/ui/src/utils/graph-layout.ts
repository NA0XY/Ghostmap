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
    .alphaDecay(0.025)
    .velocityDecay(0.4);
}
