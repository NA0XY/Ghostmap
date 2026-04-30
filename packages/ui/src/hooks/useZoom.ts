import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";
import * as d3 from "d3";

interface UseZoomResult {
  svgRef: RefObject<SVGSVGElement>;
  containerRef: RefObject<SVGGElement>;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: (nodeCount: number) => void;
  resetView: () => void;
}

export function useZoom(width: number, height: number): UseZoomResult {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) {
      return;
    }

    const svg = d3.select(svgRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.05, 8])
      .filter((event: Event) => event.type !== "dblclick")
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        if (!containerRef.current) {
          return;
        }
        d3.select(containerRef.current).attr("transform", event.transform.toString());
      });

    svg.call(zoom);
    zoomRef.current = zoom;

    return () => {
      svg.on(".zoom", null);
    };
  }, [height, width]);

  const zoomIn = useCallback((): void => {
    if (!svgRef.current || !zoomRef.current) {
      return;
    }
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomRef.current.scaleBy, 1.4);
  }, []);

  const zoomOut = useCallback((): void => {
    if (!svgRef.current || !zoomRef.current) {
      return;
    }
    d3.select(svgRef.current)
      .transition()
      .duration(200)
      .call(zoomRef.current.scaleBy, 1 / 1.4);
  }, []);

  const fitToScreen = useCallback(
    (_nodeCount: number): void => {
      if (!svgRef.current || !zoomRef.current || !containerRef.current) {
        return;
      }
      const bbox = containerRef.current.getBBox();
      if (bbox.width === 0 || bbox.height === 0) {
        return;
      }

      const padding = 60;
      const scaleX = (width - padding * 2) / bbox.width;
      const scaleY = (height - padding * 2) / bbox.height;
      const scale = Math.min(scaleX, scaleY, 2);

      const translateX = width / 2 - (bbox.x + bbox.width / 2) * scale;
      const translateY = height / 2 - (bbox.y + bbox.height / 2) * scale;

      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(
          zoomRef.current.transform,
          d3.zoomIdentity.translate(translateX, translateY).scale(scale),
        );
    },
    [height, width],
  );

  const resetView = useCallback((): void => {
    if (!svgRef.current || !zoomRef.current) {
      return;
    }
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomRef.current.transform, d3.zoomIdentity);
  }, []);

  return { svgRef, containerRef, zoomIn, zoomOut, fitToScreen, resetView };
}
