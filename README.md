# ekeric13.github.io

Personal portfolio for Eric Kennedy.

## Structure

- `index.html` - portfolio homepage
- `index_v_mario.html` - Mario/career game version
- `styles/site.css` - shared styling
- `js/mario-*.js` - Mario/career game scripts
- `projects/anime-pics/` - AnimePics architecture deep dive
- `projects/event-bus/` - event bus deep-dive skeleton
- `projects/ai-contact-center-matching/` - sanitized AI contact center matching deep dive
- `projects/ai-agent-gateway/` - sanitized agent gateway skeleton

This is intentionally plain static HTML/CSS so it can be hosted directly from GitHub Pages without a build step.

## Run locally

From the repo root:

```bash
python3 -m http.server 8123
```

Then open:

- Homepage: `http://127.0.0.1:8123/`
- Mario page: `http://127.0.0.1:8123/index_v_mario.html`

Stop the server with `Ctrl+C`.

## Test Mario

Run the unit tests for the Mario level data and stomp messages:

```bash
npm run test:level
```

Run the full Mario browser/visual test suite:

```bash
npm run test:browser
```

Update visual snapshots after an intentional rendering change:

```bash
npm run test:browser:update
```
