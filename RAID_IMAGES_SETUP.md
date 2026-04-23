# Raid Images Setup Guide

## Required Images

The raid system needs the following images to be placed in the `images/raids/` folder:

### 1. Raid Boss Image
**Path**: `images/raids/raid_wind_lord.jpg`
**Used for**: Active raid boss display
**Description**: Image of "Повелитель ветра" (Wind Lord) boss
**Recommended size**: 800x600 or similar (max 10MB)

**Where it's used**:
- When selecting boss in raid menu
- During active raid battle screen
- Shows boss appearance and theme

### 2. Raid Waiting Image
**Path**: `images/raids/raid_waiting.jpg`
**Used for**: Countdown screen when no raid is active
**Description**: Generic raid waiting/countdown screen
**Recommended size**: 800x600 or similar (max 10MB)

**Where it's used**:
- When raid is on cooldown
- Shows countdown timer: "Появится через X мин Y сек"
- Displays next boss preview

### 3. Raid Main Menu Image (Optional)
**Path**: `images/raids/raid_main.jpg`
**Used for**: Main raids menu entry screen
**Description**: General raids menu background
**Recommended size**: 800x600 or similar (max 10MB)

**Where it's used**:
- First screen when clicking "🐉 Рейды"
- Shows raid system introduction

## Folder Structure

```
project/
├── images/
│   ├── races/
│   ├── locations/
│   └── raids/              ← CREATE THIS FOLDER
│       ├── raid_wind_lord.jpg    ← Boss image
│       ├── raid_waiting.jpg      ← Waiting screen
│       └── raid_main.jpg         ← Main menu (optional)
```

## Setup Instructions

### Step 1: Create Folder
```bash
mkdir images/raids
```

### Step 2: Add Images
Place the following images in `images/raids/`:
1. `raid_wind_lord.jpg` - Wind Lord boss
2. `raid_waiting.jpg` - Countdown screen
3. `raid_main.jpg` - Main menu (optional)

### Step 3: Verify
Check that files exist:
```bash
ls -la images/raids/
```

Should show:
```
raid_wind_lord.jpg
raid_waiting.jpg
raid_main.jpg (optional)
```

## Image Requirements

### Technical Specs:
- **Format**: JPG (preferred) or PNG
- **Max size**: 10MB (Telegram limit ~20MB, but keep under 10MB)
- **Recommended resolution**: 800x600, 1024x768, or 1280x720
- **Aspect ratio**: 4:3 or 16:9

### Content Guidelines:

#### raid_wind_lord.jpg:
- Should depict a powerful wind-themed boss
- Epic/fantasy style
- Intimidating appearance
- Wind/storm elements (clouds, lightning, tornadoes)
- Color scheme: Blues, whites, grays

#### raid_waiting.jpg:
- Mysterious/anticipation theme
- Could show silhouette of boss
- Countdown/timer aesthetic
- Dark/moody atmosphere
- Text overlay friendly (countdown will be added)

#### raid_main.jpg:
- Epic raid battle scene
- Multiple players fighting together
- Heroic/cooperative theme
- Bright/exciting colors

## Fallback Behavior

If images are missing, the bot will:
1. Log error: `Изображение не найдено: raids/raid_wind_lord.jpg`
2. Send text-only message with 📸 emoji
3. Continue functioning (no crash)

## Code References

### Where images are loaded:
```javascript
// bot.js
editImageWithText(chatId, messageId, `raids/${raid.boss_image}`, ...)
editImageWithText(chatId, messageId, 'raids/raid_waiting.jpg', ...)
editImageWithText(chatId, messageId, 'raids/raid_main.jpg', ...)
```

### Image path construction:
```javascript
// raids.js
const RAID_BOSSES = [
  {
    name: 'Повелитель ветра',
    image: 'raid_wind_lord.jpg',  // ← Filename only
    // ...
  }
];

// bot.js uses: `raids/${raid.boss_image}`
// Full path: images/raids/raid_wind_lord.jpg
```

## Testing

After adding images:
1. Start bot
2. Go to "🐉 Рейды" menu
3. Click "👹 Выбрать босса"
4. Should see:
   - If raid active: `raid_wind_lord.jpg`
   - If raid on cooldown: `raid_waiting.jpg`

## Troubleshooting

### Image not showing:
1. Check file exists: `ls images/raids/raid_wind_lord.jpg`
2. Check file size: `du -h images/raids/raid_wind_lord.jpg`
3. Check permissions: `chmod 644 images/raids/*.jpg`
4. Check logs for errors

### Image too large:
```bash
# Resize image (requires ImageMagick)
convert raid_wind_lord.jpg -resize 1024x768 -quality 85 raid_wind_lord_resized.jpg
```

### Wrong format:
```bash
# Convert PNG to JPG
convert image.png -quality 90 raid_wind_lord.jpg
```

## Image Prompts (for AI generation)

### Wind Lord Boss:
```
Epic fantasy wind elemental boss, powerful storm lord, 
floating in clouds, lightning and tornadoes, 
intimidating presence, blue and white color scheme, 
dramatic lighting, high detail, digital art
```

### Waiting Screen:
```
Mysterious raid countdown screen, silhouette of powerful boss, 
dark moody atmosphere, anticipation, storm clouds, 
fantasy game UI, epic scale, dramatic lighting
```

### Main Menu:
```
Epic raid battle scene, multiple heroes fighting together, 
cooperative gameplay, fantasy MMO style, 
bright heroic colors, action-packed, team battle
```

## Status
📋 Documentation complete
⚠️ Images need to be added manually
✅ Code ready to use images once added
