# Cooptimize Focus Timer

A simple, Cooptimize-branded pomodoro timer that works on phones and desktops.

1. Answer three questions: **What is the big goal?**, **Why am I trying to do it?** and **What will I try?**
2. Pick **15**, **30** or **45** minutes. The page goes quiet and shows only your goal and your why. The Cooptimize Cs turn like clock hands while the navy arc fills in.
3. At 00:00 the Cs line up into the logo, which shakes like an alarm clock with a soft ding.
4. Tidy up **What did I try?**, then press **Ask Joel** or **Ask Eric**. That copies a message ready to paste into Teams:

   ```
   @Joel
   Big goal: …
   Why: …
   What I tried: …
   ```

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
