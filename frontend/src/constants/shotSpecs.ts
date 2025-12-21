export const SHOT_SIZES = [
  { value: 'EWS', label: 'Extreme Wide Shot' },
  { value: 'WS', label: 'Wide Shot' },
  { value: 'FS', label: 'Full Shot' },
  { value: 'MWS', label: 'Medium Wide Shot' },
  { value: 'MS', label: 'Medium Shot' },
  { value: 'MCU', label: 'Medium Close-Up' },
  { value: 'CU', label: 'Close-Up' },
  { value: 'ECU', label: 'Extreme Close-Up' },
];

export const SHOT_TYPES = [
  { value: 'MASTER', label: 'Master' },
  { value: 'SINGLE', label: 'Single' },
  { value: 'TWO_SHOT', label: 'Two Shot' },
  { value: 'OTS', label: 'Over the Shoulder' },
  { value: 'POV', label: 'POV' },
  { value: 'INSERT', label: 'Insert' },
  { value: 'CUTAWAY', label: 'Cutaway' },
];

export const CAMERA_MOVEMENTS = [
  { value: 'STATIC', label: 'Static' },
  { value: 'PAN', label: 'Pan' },
  { value: 'TILT', label: 'Tilt' },
  { value: 'DOLLY', label: 'Dolly' },
  { value: 'TRACK', label: 'Track' },
  { value: 'CRANE', label: 'Crane' },
  { value: 'HANDHELD', label: 'Handheld' },
  { value: 'STEADICAM', label: 'Steadicam' },
  { value: 'ZOOM', label: 'Zoom' },
  { value: 'PUSH_IN', label: 'Push In' },
  { value: 'PULL_OUT', label: 'Pull Out' },
];

export const CAMERA_ANGLES = [
  { value: 'EYE_LEVEL', label: 'Eye Level' },
  { value: 'LOW_ANGLE', label: 'Low Angle' },
  { value: 'HIGH_ANGLE', label: 'High Angle' },
  { value: 'DUTCH', label: 'Dutch Angle' },
  { value: 'BIRDS_EYE', label: "Bird's Eye" },
  { value: 'WORMS_EYE', label: "Worm's Eye" },
];

export const LENSES = [
  '14mm', '18mm', '24mm', '28mm', '35mm', '50mm', '85mm', '100mm', '135mm', '200mm'
].map(v => ({ value: v, label: v }));

export const FRAME_RATES = [
  { value: '24', label: '24 fps' },
  { value: '25', label: '25 fps' },
  { value: '30', label: '30 fps' },
  { value: '48', label: '48 fps' },
  { value: '60', label: '60 fps' },
  { value: '120', label: '120 fps' },
];

export const CAMERAS = [
  { value: 'A_CAM', label: 'A Cam' },
  { value: 'B_CAM', label: 'B Cam' },
  { value: 'C_CAM', label: 'C Cam' },
  { value: 'DRONE', label: 'Drone' },
];

export const SHOT_STATUSES = [
  { value: 'PLANNED', label: 'Planned', color: 'default' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'processing' },
  { value: 'SHOT', label: 'Shot', color: 'success' },
  { value: 'WRAPPED', label: 'Wrapped', color: 'success' },
  { value: 'CUT', label: 'Cut', color: 'error' },
];
