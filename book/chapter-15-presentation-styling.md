# Chapter 15: Presentation Styling - Creating Beautiful, Branded Slides

## What You'll Learn in This Chapter

• **Template system** - 6 professional presentation templates
• **Color schemes** - Match your brand or choose from presets
• **Logo upload** - Automatic branding on every slide
• **Brand integration** - Use your saved brand profiles
• **API integration** - Send styling data to the AI

---

## Opening: Why Presentation Styling Matters

Imagine you've created an amazing presentation with the Office AI. But then you realize:

• **It looks generic** - Like it could be anyone's presentation
• **No branding** - Where's your company logo?
• **Wrong colors** - Your brand uses blue, but the slides are all white
• **Unprofessional** - Clients expect consistent branding

**A great presentation needs great styling!**

---

## The Six Presentation Templates

Your AI Dashboard includes 6 professional templates. Think of them as "starting outfits" for your presentation.

### Template 1: Corporate

**Look and Feel:**
• Clean, professional, business-focused
• White or light gray backgrounds
• Blue or navy accents
• Conservative fonts

**Best For:**
• Business meetings
• Board presentations
• Investor pitches
• Annual reports

**Example Use:**
```
Your company presents Q4 earnings to the board.
The slides look polished and professional.
Investors trust the content because it looks credible.
```

### Template 2: Modern Dark

**Look and Feel:**
• Dark background (slate/near-black)
• White or light gray text
• Sleek, contemporary design
• Subtle gradients

**Best For:**
• Tech presentations
• Developer conferences
• Modern startups
• Product launches

**Example Use:**
```
You're presenting a new software feature.
The dark mode reduces eye strain in dim conference rooms.
It looks cutting-edge and innovative.
```

### Template 3: Minimal

**Look and Feel:**
• Pure white backgrounds
• Maximum whitespace
• Simple, elegant fonts
• Minimal decorations

**Best For:**
• Academic presentations
• Research findings
• Art and design portfolios
• When content speaks loudest

**Example Use:**
```
You're presenting scientific research.
The minimal design keeps focus on your data and findings.
No distractions, just pure information.
```

### Template 4: Creative

**Look and Feel:**
• Bold, vibrant colors
• Dynamic layouts
• Eye-catching elements
• Modern typography

**Best For:**
• Marketing pitches
• Creative agency presentations
• Brand launches
• When you need to stand out

**Example Use:**
```
You're pitching a marketing campaign to a client.
The bold design shows your creativity.
They remember your presentation.
```

### Template 5: Tech

**Look and Feel:**
• Blue gradients
• Modern, innovative aesthetic
• Circuit or network motifs
• Clean lines

**Best For:**
• Developer talks
• Tech startup pitches
• Architecture presentations
• AI/ML conferences

**Example Use:**
```
You're presenting your AI Dashboard at a tech meetup.
The tech template matches your audience.
They feel at home with the design.
```

### Template 6: Elegant

**Look and Feel:**
• Black background
• Gold or bronze accents
• Premium, luxury feel
• Sophisticated typography

**Best For:**
• Executive presentations
• Luxury brand pitches
• High-end client meetings
• When you want to impress

**Example Use:**
```
You're presenting to C-level executives.
The elegant design shows sophistication.
They take your proposal seriously.
```

---

## Color Scheme Overrides

Sometimes you need specific colors. That's where overrides come in.

### The Override Options

| Scheme | Background | Text | Best For |
|--------|------------|------|----------|
| Default | Uses template | Uses template | Trust the template |
| Black/White | Black | White | High contrast, dramatic |
| White/Black | White | Black | Classic, readable |
| Blue/White | Blue | White | Corporate, trustworthy |
| Dark Blue/White | Dark Blue | White | Tech, modern |
| Green/White | Green | White | Nature, growth, finance |

### When to Override vs Use Template

**Use Template When:**
• You want cohesive design
• You're not sure what colors to use
• You want professional results quickly

**Use Override When:**
• You have specific brand colors
• The template colors don't match your needs
• You need accessibility (high contrast)

---

## Logo Upload and Branding

### Why Logos Matter

Your logo appears on:
1. **Title Slide** - First thing people see
2. **Footer** - Subtle branding on every slide
3. **Consistency** - Professional look throughout

### How It Works

**The Process:**
```typescript
// 1. User uploads logo
const [logo, setLogo] = useState<string | null>(null);

// 2. File gets converted to base64
const reader = new FileReader();
reader.onload = (event) => {
  setLogo(event.target?.result as string);
};
reader.readAsDataURL(file);

// 3. Logo sent to API
const styling = {
  template: "corporate",
  logo: logo,  // Base64 encoded image
};

// 4. AI includes logo in generated HTML
// The logo appears on title slide and footer
```

### Supported Formats

• **PNG** - Best for logos with transparency
• **SVG** - Scalable, always crisp
• **JPEG** - Good for photos

**Recommended:** Use PNG or SVG for best quality.

---

## Brand Profile Integration

### The Smart Connection

Your Dashboard already has a **Brand Workspace** (Chapter 11). The presentation tool can use saved brands!

**How It Works:**

```typescript
// 1. Select brand from dropdown
const [selectedBrandId, setSelectedBrandId] = useState('');
const [brands, setBrands] = useState([]);

// 2. Fetch brands from API
useEffect(() => {
  fetch('/api/brand-workspace?action=brands')
    .then(r => r.json())
    .then(data => setBrands(data.brands));
}, []);

// 3. When brand selected, auto-load its logo
const handleBrandChange = (brandId) => {
  setSelectedBrandId(brandId);
  const brand = brands.find(b => b.id === brandId);
  if (brand?.logo) {
    setLogo(brand.logo);  // Auto-load!
  }
};
```

**Benefits:**
• ✅ Consistent branding across all materials
• ✅ No need to re-upload logos
• ✅ Uses your established brand voice

---

## The Complete Styling Panel

### Visual Layout

```
┌─────────────────────────────────────┐
│  Presentation Styling               │
├─────────────────────────────────────┤
│                                     │
│  Template Style                     │
│  ┌────────┬────────┬────────┐    │
│  │Corp    │Modern  │Minimal │    │
│  │Dark    │White   │Elegant │    │
│  │Creative│Tech    │        │    │
│  └────────┴────────┴────────┘    │
│                                     │
│  Color Scheme Override              │
│  [▼ Use Template Colors        ]   │
│                                     │
│  Brand Logo                         │
│  [🖼️ Logo Preview]  [Change Logo]   │
│  Logo appears on title & footer     │
│                                     │
│  Use Brand Profile                  │
│  [▼ No Brand (Custom)            ]   │
│                                     │
└─────────────────────────────────────┘
```

### User Flow

1. **Select Template** - Choose the visual style
2. **Override Colors** (Optional) - Customize if needed
3. **Upload Logo** (Optional) - Add your branding
4. **Select Brand** (Optional) - Use saved brand profile
5. **Generate** - AI creates styled presentation

---

## PROMPT YOU CAN USE

### Prompt 1: Generate Styled Presentation

**Where to use:** Office AI page

```javascript
// Fill in the form:
Template: "Corporate"
Color Scheme: "Blue/White"
Logo: [Upload your-logo.png]
Brand: "My Company"

// Then generate:
Action: "Create outline"
Topic: "Q4 Sales Results"
Audience: "Executives"
Duration: "15 minutes"
Purpose: "Inform"
```

### Prompt 2: API Call with Styling

**Where to use:** Custom API integration

```javascript
const response = await fetch('/api/office-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'presentation',
    action: 'outline',
    data: {
      topic: 'Annual Company Report',
      audience: 'shareholders',
      duration: 30,
      purpose: 'inform'
    },
    styling: {
      template: 'elegant',
      colorScheme: 'black-white',
      logo: 'data:image/png;base64,iVBORw0...',
      brandId: 'brand-123'
    }
  })
});

const result = await response.json();
console.log('Styled presentation:', result.outline);
```

### Prompt 3: Custom Template Definition

**Where to use:** Extend templates

```typescript
// In your code, add a custom template:
const customTemplates = [
  ...defaultTemplates,
  {
    id: 'healthcare',
    name: 'Healthcare',
    desc: 'Medical, clean, trustworthy',
    colors: 'bg-white text-teal-600',
    accent: 'teal'
  }
];

// Use it:
setTemplate('healthcare');
```

---

## How to Personalize This for YOUR Dashboard

### Option 1: Add Custom Templates

**File:** `src/app/office/ai/page.tsx`

Find the templates array and add yours:

```typescript
const templates = [
  // ... existing templates ...
  {
    id: 'my-company',
    name: 'My Company',
    desc: 'Our official brand colors',
    colors: 'bg-blue-900 text-white'
  }
];
```

### Option 2: Change Default Template

**File:** `src/app/office/ai/page.tsx`

```typescript
// Change default
const [colorTheme, setColorTheme] = useState('corporate');  // Was 'default'
```

### Option 3: Add More Color Schemes

**File:** `src/app/office/ai/page.tsx`

```typescript
// Add to the color theme select:
<option value="purple-white">Purple Background / White Text</option>
<option value="orange-white">Orange Background / White Text</option>
<option value="red-white">Red Background / White Text</option>
```

### Option 4: Logo Position Options

**File:** `src/app/api/office-ai/route.ts`

```typescript
// In the prompt, specify logo position:
const prompt = `
  Create a presentation with:
  • Template: ${styling.template}
  • Logo position: ${styling.logoPosition || 'footer'}
  • Logo appears on: ${styling.logoOn || 'all slides'}
`;
```

---

## Common Pitfalls & How to Avoid Them

### Pitfall 1: "Logo doesn't appear on slides"

**Problem:** Logo not included in API call

**Solution:** Ensure styling object includes logo:
```typescript
// ❌ Bad: Missing logo
const styling = { template: 'corporate' };

// ✅ Good: Includes logo
const styling = { 
  template: 'corporate',
  logo: logo  // Base64 string
};
```

### Pitfall 2: "Colors don't match my brand"

**Problem:** Using wrong color scheme

**Solution:** Create custom template or use exact hex codes:
```typescript
// Add custom CSS for exact colors
const customStyles = `
  .slide {
    background-color: #0066CC !important;
    color: #FFFFFF !important;
  }
`;
```

### Pitfall 3: "Template looks different than preview"

**Problem:** AI generates different HTML than expected

**Solution:** Give AI more specific instructions:
```typescript
const prompt = `
  Use EXACTLY this color scheme:
  • Background: #0f172a (slate-900)
  • Text: #ffffff (white)
  • Accents: #fbbf24 (amber-400)
  
  Do not deviate from these colors.
`;
```

### Pitfall 4: "Logo is too big/small"

**Problem:** No size constraints on logo

**Solution:** Add CSS constraints:
```css
.logo {
  max-width: 150px;
  max-height: 50px;
  object-fit: contain;
}
```

---

## Key Takeaways

1. **Six templates** cover most use cases (Corporate, Modern Dark, Minimal, Creative, Tech, Elegant)
2. **Color overrides** let you customize when templates don't match
3. **Logo upload** automatically brands every presentation
4. **Brand profiles** connect to your existing workspace
5. **All styling** sent to API for AI to incorporate

---

## Next Steps

**Your presentations now look professional and branded!**

• Try each template to see which fits your needs
• Upload your company logo
• Save your brand profile for consistent use
• Generate a presentation and see the styling in action

**What's next?**
• Chapter 16: Edge Runtime - Fast, secure deployment
• Chapter 17: Troubleshooting - When things go wrong
• Chapter 20: Complete Prompt Library - Copy-paste prompts

**Or try:**
• Create a presentation with each template
• Upload different logos and see how they look
• Mix templates with color overrides
• Present to a friend and get feedback

---

*Remember: Great content deserves great presentation. Styling makes your work memorable!*

---

**End of Chapter 15**

**Questions?** Experiment with the Office AI page and see what looks best!

**Code reference:** `src/app/office/ai/page.tsx`, `src/app/api/office-ai/route.ts`