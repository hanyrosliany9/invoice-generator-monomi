import 'fabric';

declare module 'fabric' {
  namespace fabric {
    interface Object {
      elementType?: 'text' | 'image' | 'shape' | 'line' | 'placeholder';
      templateElementId?: string;
      shapeId?: string;
      assetId?: string;
      assetUrl?: string;
      placeholderType?: 'image' | 'text';
      id?: string;
      name?: string;
      customData?: Record<string, any>;
    }
  }
}
