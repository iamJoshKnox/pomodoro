# Cooptimize Focus Timer

A simple, Cooptimize-branded pomodoro timer that works on phones and desktops.

1. Answer three questions: **What's the big goal?**, **Why?** and **What I will try:**
   Click the red **(Think Hard)** link next to Why to add another Why box, then **(Think Harder)** and **(UltraThink)** to dig deeper still (up to four whys). The extra boxes fold away when the page is refreshed (clicking the links again brings back what you wrote), but folded whys still count: they're included in the timer's single Why line and in the Teams message.
2. Pick **15**, **30** or **45** minutes. The page switches to a dark night-mode focus screen showing your goal and your whys, joined into one comma-separated answer. The last box, now labelled **What I am trying:**, stays open so you can jot notes as you work. Tick marks along the navy C count down from your session length to 0, and the navy arc starts full and shrinks toward the red pointer at the 0 mark as time runs out. The other Cooptimize Cs turn like clock hands, and the red dot breathes (in for 4 seconds, out for 4).
3. At 00:00 the Cs line up into the logo, which shakes like an alarm clock with a soft ding.
4. The whys are merged into a single Why box. Tidy it and **What I tried:**, then press an **Ask** button (Ask Joel, Ask Eric…). That copies a message ready to paste into Teams, with all the whys and all the notes each joined into one line:

   ```
   Joel, I need help.
   Goal: Fix Broken Power BI Report
   Why: It is broken, users do not like broken reports.
   What I tried: Open report in powerbi.com app, Investigate DAX measures, Look at stored procedures populating reported facts.
   @Joel Leichty
   ```

   Pasted text can't become a real Teams tag, so the @name goes last: after pasting, delete its last letter and Teams suggests the person, which tags them properly.

   **Edit people** (under the Ask buttons) sets who you can ask. Use each name as it appears in Teams; the button shows the first name. The list is saved in your browser.

It is plain HTML, CSS and JavaScript: no build step and no dependencies.

## Run it locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Add `?fast` to the URL (`http://localhost:8000/?fast`) to make sessions run 60x faster while testing.

## Publish with GitHub Pages

In the repository go to **Settings → Pages**, choose **Deploy from a branch**, then pick the branch and the `/ (root)` folder. The site is served over HTTPS, which the copy-to-clipboard button needs. There is also a fallback for plain HTTP.

## Notes

- Brand colors were sampled from the logo and live as CSS variables at the top of `styles.css`, so they're easy to swap for the official values.
- Fields and any running session are saved in the browser, so a refresh doesn't lose them.
- On phones the screen is kept awake during a session (where supported) so the timer is still running to ding.
- Teams only turns `@Joel` into a real mention when it's typed, so you may need to retype the mention after pasting.
