# Powered Shopping - User Interface Interaction Guide

Generated on: 2026-04-20
Audience: End users and demo reviewers

## 1. What this app is for

Powered Shopping is a voice-enabled shopping interface where you can:
- sign in
- search products by typing or voice
- add/remove items in cart
- ask for recommendations
- complete checkout in guided steps

You can use it in two ways:
- Voice-first mode (speak commands)
- Manual mode (type commands and use on-screen buttons)

## 2. User journey at a glance

1. Open app and sign in (Email/Password or Google).
2. Land on dashboard with navigation menu and live status chips.
3. Browse products in Shop view or use Voice Copilot.
4. Add items to cart from product cards or commands.
5. Open Checkout and complete 3-step flow.
6. Place order and continue shopping.

## 3. Login screen (Auth)

What user sees:
- Login/Sign Up tabs
- Email and Password fields
- Continue with Google button
- Theme toggle (Light/Dark)

How user interacts:
- Choose `Login` if account exists, or `Sign Up` for new account.
- Enter credentials and submit.
- On success, dashboard opens.
- On failure, error message appears on same screen.

## 4. Main dashboard layout

After login, the interface has these zones:
- Left sidebar navigation
- Top status bar
- Main content area (changes by selected view)
- Optional floating buttons (`AI` and `Mic`)

### Sidebar menu options

- Mission Control (overview)
- Catalog AI (shopping view)
- Cart Queue
- Checkout
- Voice Copilot
- System (settings)
- Help (FAQ)

### Live status indicators users will notice

- Catalog Mode: `Live` or `Backup`
- Cart Items count
- Commands count
- Mic state: `Mic Live` or `Mic Idle`
- AI mode: `Online` or `Fallback`

## 5. Overview (Mission Control)

Purpose:
- Quick start experience for first-time users.

User actions available:
- Start Shopping
- Open Voice Assistant
- Go to Checkout
- Quick category buttons
- One-click sample command buttons

This screen helps users begin without needing setup knowledge.

## 6. Shop view (Catalog AI)

This is the primary browsing screen.

### Product interaction

Each product card shows:
- image
- name
- category
- INR price
- rating
- `Queue with AI` button

When user taps `Queue with AI`:
- item is added to cart
- cart count and total update immediately

### Smart filters users can control

- Search text
- Category
- Sort (default / price low-high / price high-low / highest rated)
- Max price
- Minimum rating

Buttons:
- `Apply` runs current filter set
- `Reset` clears filter inputs

## 7. Voice Copilot interaction

Voice panel supports three input styles:
- Live mic stream (`Activate Voice Stream`)
- Fallback recorder (`Record Voice Command`)
- Manual text command box

### Continuous mode

If enabled, app keeps listening after each command until user stops it.

### Sample commands users can speak/type

- "Find premium headphones under 5000"
- "Show top rated sneakers"
- "Add the first result to cart"
- "Remove smartwatch from cart"
- "Recommend trending gadgets"
- "Prepare checkout"

### What user gets back

- Spoken response (if Voice Replies setting is ON)
- Updated product list/cart/recommendations
- Conversation history entry

## 8. Cart interaction (Cart Queue)

Cart panel shows:
- all selected items
- quantity x item price
- total cart value

User actions:
- `Remove` individual items
- `Open Checkout Flow` for guided 3-step checkout
- `Instant Checkout` for fast direct checkout

If cart is empty, panel shows "Cart is empty." and checkout buttons stay disabled.

## 9. Checkout interaction (3-step)

Step 1: Delivery
- full name, email, phone, address, city, zip

Step 2: Payment
- choose Card / UPI / Cash on Delivery
- card mode asks for name and last 4 digits

Step 3: Review
- shipping details
- contact details
- payment type
- order summary

Pricing shown to user:
- Subtotal
- Shipping (free above threshold)
- Tax
- Final payable amount

On successful order:
- confirmation screen appears
- shows Order ID and amount paid
- `Continue Shopping` takes user back to browsing

## 10. Settings interaction (System)

User can toggle:
- Voice replies
- AI assistant mode
- Auto-open cart after add
- Show floating microphone buttons
- Compact layout density
- High contrast mode

Utility actions:
- Clear conversation history
- Clear saved last category
- Reset all settings to defaults

## 11. Help and FAQ

Help section gives user-readable answers for:
- how to start voice commands
- shopping without voice
- backup catalog behavior
- cart persistence behavior
- supported command types

## 12. Fallback behavior users should know

To keep experience stable, interface auto-falls back when a service is down:
- If live catalog fails: backup catalog is used.
- If browser speech recognition fails: fallback recorder is available.
- If AI assistant mode fails: deterministic command parser handles common commands.
- If cloud cart storage is unavailable: cart runs in temporary local memory mode.

From user perspective, app still works with minor feature limitations.

## 13. Mobile interaction notes

- Sidebar opens with `Menu` button.
- Floating `AI` and `Mic` buttons give quick access.
- Core flows (search, add, cart, checkout) are available on mobile and desktop.

## 14. Quick first-time user script (demo ready)

1. Login with email/password.
2. Open `Catalog AI`.
3. Say: "Show sneakers under 3000".
4. Add one item using card button.
5. Open cart and remove one item.
6. Go to checkout and complete all 3 steps.
7. Place order and show confirmation screen.

---

End of user interaction guide.
