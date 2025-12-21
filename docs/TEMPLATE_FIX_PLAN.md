# Template Fix Plan

## Problem
Slide templates don't render. When user creates a slide with template (e.g., MOOD_BOARD), only a blank slide appears.

## Root Cause
1. Backend creates slide with `template` field set but **NO elements created**
2. Frontend's `applyTemplate()` in `useSlideTemplates.ts` is **NEVER called**
3. Templates are defined but never applied to canvas or saved to DB

## Flow Diagram
```
User clicks "New Slide" → MOOD_BOARD
    ↓
NewSlideButton.tsx:42 → onAddSlide('MOOD_BOARD')
    ↓
DeckEditorPage.tsx:104 → addSlideMutation.mutate('MOOD_BOARD')
    ↓
slidesApi.create({ deckId, template: 'MOOD_BOARD' })
    ↓
Backend creates slide with template='MOOD_BOARD', elements=[]  ❌ EMPTY!
    ↓
SlideCanvas loads slide.elements (empty array)
    ↓
Nothing renders ❌
```

## Solution
Apply template on frontend after slide creation, save elements to backend.

---

## Task 1: Update DeckEditorPage.tsx

**File**: `frontend/src/pages/DeckEditorPage.tsx`

### Step 1.1: Import `getTemplate` and types

Find line ~31:
```typescript
import { SlideTemplateType } from '../templates/templateTypes';
```

Add after it:
```typescript
import { getTemplate } from '../templates/templateDefinitions';
import { percentToPixel } from '../utils/deckCanvasUtils';
```

### Step 1.2: Update addSlideMutation onSuccess

Find lines 103-111:
```typescript
const addSlideMutation = useMutation({
  mutationFn: (templateType: SlideTemplateType) =>
    slidesApi.create({ deckId: id!, template: templateType }),
  onSuccess: (res) => {
    queryClient.invalidateQueries({ queryKey: ['deck', id] });
    setSelectedSlideId(res.id);
    message.success('Slide added');
  },
});
```

Replace with:
```typescript
const addSlideMutation = useMutation({
  mutationFn: (templateType: SlideTemplateType) =>
    slidesApi.create({ deckId: id!, template: templateType }),
  onSuccess: async (res, templateType) => {
    // Apply template elements if not BLANK
    if (templateType !== 'BLANK') {
      const template = getTemplate(templateType);
      const slideWidth = deck?.slideWidth || 1920;
      const slideHeight = deck?.slideHeight || 1080;

      // Create elements from template
      for (const el of template.elements) {
        const props = el.properties as any;
        await elementsApi.create({
          slideId: res.id,
          type: el.type === 'text' ? 'TEXT' : el.type === 'placeholder' ? 'IMAGE' : 'SHAPE',
          x: (props.left / slideWidth) * 100,
          y: (props.top / slideHeight) * 100,
          width: ((props.width || 200) / slideWidth) * 100,
          height: ((props.height || 100) / slideHeight) * 100,
          rotation: props.angle || 0,
          content: {
            text: props.text,
            placeholder: props.placeholder,
            placeholderType: props.placeholderType,
            fontSize: props.fontSize,
            fontFamily: props.fontFamily,
            fontWeight: props.fontWeight,
            fill: props.fill,
            stroke: props.stroke,
            shapeType: props.shapeType || 'RECT',
            originX: props.originX,
            originY: props.originY,
            textAlign: props.textAlign,
          },
        });
      }

      // Update slide background if template has one
      if (template.backgroundColor) {
        await slidesApi.update(res.id, { backgroundColor: template.backgroundColor });
      }
    }

    queryClient.invalidateQueries({ queryKey: ['deck', id] });
    setSelectedSlideId(res.id);
    message.success('Slide added');
  },
});
```

### Step 1.3: Add elementsApi import

Verify line ~31 has:
```typescript
import { decksApi, slidesApi, elementsApi } from '../services/decks';
```

---

## Task 2: Update SlideCanvas Element Loading

**File**: `frontend/src/components/deck/SlideCanvas.tsx`

### Step 2.1: Update elementToFabricObject call

Find lines 47-56:
```typescript
for (const element of slide.elements || []) {
  const fabricObj = await elementToFabricObject(
    element,
    canvasWidth,
    canvasHeight
  );
  if (fabricObj) {
    canvas.add(fabricObj);
  }
}
```

Verify this exists and works. The key is that `element.content` must contain proper data.

---

## Task 3: Fix deckCanvasUtils.ts for Placeholders

**File**: `frontend/src/utils/deckCanvasUtils.ts`

### Step 3.1: Add placeholder handling to elementToFabricObject

Find line 387 (start of elementToFabricObject function) and update the function.

Add this case after the `if (element.type === 'IMAGE')` block (~line 445):

```typescript
// Handle placeholder elements (saved as IMAGE type with placeholder content)
if (element.type === 'IMAGE' && element.content?.placeholder) {
  const content = element.content as any;
  const rect = new Rect({
    left,
    top,
    width,
    height,
    fill: '#f9fafb',
    stroke: '#d1d5db',
    strokeWidth: 2,
    strokeDashArray: [8, 4],
    rx: 8,
    ry: 8,
  });
  rect.set('id', element.id);
  rect.set('elementType', 'placeholder');
  rect.set('placeholder', content.placeholder);
  return rect;
}
```

---

## Task 4: Test the Fix

1. Restart frontend: `cd frontend && npm run dev`
2. Navigate to `/decks`
3. Open any deck
4. Click "New Slide" dropdown → Select "Mood Board"
5. Verify template elements appear on canvas

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `frontend/src/pages/DeckEditorPage.tsx` | Add template element creation in onSuccess |
| `frontend/src/utils/deckCanvasUtils.ts` | Add placeholder element handling |

## Expected Result
When selecting a template, elements should appear on canvas with proper layout.
