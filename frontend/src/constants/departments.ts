export const DEPARTMENTS = [
  { value: 'Production', label: 'Production' },
  { value: 'Director', label: 'Director' },
  { value: 'Camera', label: 'Camera' },
  { value: 'Sound', label: 'Sound' },
  { value: 'Lighting', label: 'Lighting / Grip' },
  { value: 'Art', label: 'Art Department' },
  { value: 'Wardrobe', label: 'Wardrobe' },
  { value: 'Makeup', label: 'Hair & Makeup' },
  { value: 'Script', label: 'Script' },
  { value: 'Locations', label: 'Locations' },
  { value: 'Transport', label: 'Transport' },
  { value: 'Catering', label: 'Catering' },
  { value: 'Safety', label: 'Safety' },
  { value: 'Other', label: 'Other' },
];

export const COMMON_POSITIONS: Record<string, string[]> = {
  Production: ['Producer', 'Line Producer', 'Production Manager', 'Production Coordinator', 'PA'],
  Director: ['Director', '1st AD', '2nd AD', '2nd 2nd AD'],
  Camera: ['DP', 'Camera Operator', '1st AC', '2nd AC', 'DIT', 'Steadicam Op'],
  Sound: ['Sound Mixer', 'Boom Operator', 'Sound Utility'],
  Lighting: ['Gaffer', 'Best Boy Electric', 'Electric', 'Key Grip', 'Best Boy Grip', 'Grip', 'Dolly Grip'],
  Art: ['Production Designer', 'Art Director', 'Set Decorator', 'Prop Master', 'Set Dresser'],
  Wardrobe: ['Costume Designer', 'Wardrobe Supervisor', 'Costumer'],
  Makeup: ['Makeup Artist', 'Hair Stylist', 'SFX Makeup'],
  Script: ['Script Supervisor'],
  Locations: ['Location Manager', 'Location Scout', 'Location PA'],
  Transport: ['Transportation Coordinator', 'Driver'],
  Catering: ['Craft Services', 'Caterer'],
  Safety: ['Medic', 'Safety Coordinator', 'Stunt Coordinator'],
};

export const CALL_STATUS_COLORS: Record<string, string> = {
  PENDING: 'default',
  CONFIRMED: 'processing',
  ON_SET: 'success',
  WRAPPED: 'default',
};
