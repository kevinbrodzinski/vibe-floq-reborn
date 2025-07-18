export interface FieldTile {
  tile_id: string;
  crowd_count: number;
  avg_vibe: {
    h: number;
    s: number;
    l: number;
  };
  active_floq_ids: string[];
  updated_at: string;
}

export interface ScreenTile extends FieldTile {
  x: number;
  y: number;
  radius: number;
  color: string;
  hsl: {
    h: number;
    s: number;
    l: number;
  };
}