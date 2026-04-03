import type { ComponentType } from 'react'
import type { VizProps } from './vizProps'
import { QuadtreeInsertViz } from './QuadtreeInsertViz'
import { SkipListSearchViz } from './SkipListSearchViz'

/** Register new visualizations by kind string from Go traces. */
export const VISUALIZATIONS: Record<string, ComponentType<VizProps>> = {
  'skiplist-search': SkipListSearchViz,
  'quadtree-insert': QuadtreeInsertViz,
}
