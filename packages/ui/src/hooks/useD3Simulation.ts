import { useCallback, useEffect, useRef, useState } from "react";
import * as d3 from "d3";
import type { GraphData } from "@ghostmap/core";
import type { SimulationLink, SimulationNode } from "../types/ui.js";
import { createSimulation } from "../utils/graph-layout.js";

interface UseD3SimulationResult {
  simulationNodes: SimulationNode[];
  simulationLinks: SimulationLink[];
  isStabilized: boolean;
  reheat: () => void;
}

export function useD3Simulation(
  data: GraphData,
  width: number,
  height: number,
): UseD3SimulationResult {
  const [simulationNodes, setSimulationNodes] = useState<SimulationNode[]>([]);
  const [simulationLinks, setSimulationLinks] = useState<SimulationLink[]>([]);
  const [isStabilized, setIsStabilized] = useState(false);

  const simulationRef = useRef<d3.Simulation<SimulationNode, SimulationLink> | null>(null);
  const rafRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const stopSimulation = useCallback((): void => {
    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current.on("tick", null);
      simulationRef.current = null;
    }
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const initSimulation = useCallback((): void => {
    stopSimulation();
    setIsStabilized(false);

    const nodes: SimulationNode[] = data.nodes.map((node) => ({ ...node }));
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));

    const links: SimulationLink[] = data.edges
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        type: edge.type,
        id: edge.id,
      }))
      .filter((link) => {
        if (typeof link.source !== "string" || typeof link.target !== "string") {
          return false;
        }
        return nodeMap.has(link.source) && nodeMap.has(link.target);
      });

    setSimulationNodes(nodes);
    setSimulationLinks(links);

    const sim = createSimulation(nodes, links, width, height);
    simulationRef.current = sim;

    const scheduleRender = (): void => {
      if (!mountedRef.current || rafRef.current !== null) {
        return;
      }
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (!mountedRef.current) {
          return;
        }
        setSimulationNodes([...nodes]);
        setSimulationLinks([...links]);
      });
    };

    sim.on("tick", scheduleRender);
    sim.on("end", () => {
      if (mountedRef.current) {
        setIsStabilized(true);
      }
    });

    sim.restart();
  }, [data, height, stopSimulation, width]);

  useEffect(() => {
    mountedRef.current = true;
    initSimulation();
    return () => {
      mountedRef.current = false;
      stopSimulation();
    };
  }, [initSimulation, stopSimulation]);

  return {
    simulationNodes,
    simulationLinks,
    isStabilized,
    reheat: initSimulation,
  };
}
