Phoenix.set({
  daemon: false,
  openAtLogin: true
})

/*
 * whichScreen: an int indicating which screen. Screens are indexed from left to right.
 * whichHalf: one of "left", "right", "maximized".
 */
const placeWindow = (window, whichScreen, whichHalf) => {
  const screens = Screen.all().sort((a, b) => a.flippedFrame().x - b.flippedFrame().x);
  // If whichScreen is greater than the number of screens, just use the last (right-most) screen. This will be
  // the case when using this configuration on a laptop with no external monitors connected.
  const screen = screens[Math.min(whichScreen, screens.length - 1)];
  const frame = screen.flippedFrame();
  const width = whichHalf == "maximized" ? frame.width: frame.width / 2;
  const x = frame.x + (whichHalf == "right" ? width : 0);
  const destFrame = { x: x, y: frame.y, width: width, height: frame.height };
  window.setFrame(destFrame);
}

const centerWindow = (window) => {
  const frame = window.screen().flippedFrame();
  const width = frame.width / 2;
  const x = frame.x + width / 2;
  const destFrame = { x: x, y: frame.y, width: width, height: frame.height };
  window.setFrame(destFrame);
}

/*
 * Focuses the most recently accessed window of an app, if it's open. If it's not open, launch it.
 */
const launchOrFocus = (appName) => {
  const  app = App.get(appName);
  if (!app) {
    if (!App.launch(appName, { focus: true })) {
      Phoenix.notify(`Failed to launch app "${appName}". Maybe it's not installed?`);
    }
    return;
  }

  // NOTE(philc): app.windows() returns windows in the most recently-accessed order. However, sometimes
  // the app implements its own window selection and focusing behavior when the app is activated. This is
  // empirically the case with Google Chrome: if you try to focus a window which is not the "main window",
  // Chrome will instead just focus the main window. This can be reproduced easily outside of Phoenix
  // by command-tabbing to Chrome: when you do this, the main window will always be the one that gets the
  // focus. To work around this, uncheck "Displays have separate Spaces" in System Preferences.
  const window = app.windows()[0];
  if (window) {
    window.focus();
  } else {
    // The app may have no windows yet. If so, just focus the app.
    app.focus();
  }
};

const lockScreen = () => {
  Task.run("/Users/phil/scripts/macos/lock_screen.sh", [], (task) => {
    if (task.status != 0)
      Phoenix.notify("Lock screen script did not successfully exit.");
  });
};

const volumeModal = Modal.build({ duration: 0 });
volumeModal.origin = { x: 0, y: 0 };

const changeVolume = (increment) => {
  Task.run("/Users/phil/scripts/macos/changevolume.rb", [increment.toString()], (task) => {
    if (task.status != 0) {
      Phoenix.notify("Change volume script did not successfully exit.");
      return;
    }
    const newVolume = parseInt(task.output);
    volumeModal.text = `Volume: ${newVolume}`;
    if (volumeModal.displayTimer != null)
      clearTimeout(volumeModal.displayTimer);
    volumeModal.displayTimer = setTimeout(() => {
      volumeModal.close();
      volumeModal.displayTimer = null;
    }, 1500);
    volumeModal.show();
  });
};

const timeModal = Modal.build({ duration: 4 });

const showTime = () => {
  const date = new Date();
  // This returns "hh:mm:ss AM". Strip off the seconds.
  const timeString = date.toLocaleTimeString().replace(/:\d\d /, " ");
  // This returns "Tue May 12 2020". Strip off the year.
  const dateString = date.toDateString().replace(/ \d\d\d\d/, "");
  timeModal.text = `${timeString}\n${dateString}`;

  const modalFrame = timeModal.frame();
  const focusedWindow = Window.focused();
  const screen = focusedWindow ? focusedWindow.screen() : Screen.main();
  const screenFrame = screen.flippedFrame();
  timeModal.origin = { x: screenFrame.x + (screenFrame.width - modalFrame.width) / 2,
                       y: screenFrame.y + (screenFrame.height - modalFrame.height) / 2 };
  timeModal.show();
};

/*
 * Hides every app, except the frontmost (focused) app.
 */
const hideUnfocusedApps = () => {
  const focused = App.focused();
  const focusedPid = focused.processIdentifier();
  const allApps = App.all();
  for (let app of allApps) {
    if (app.processIdentifier() != focusedPid) {
      app.hide();
    }
  }
};

/*
 * Moves all windows to thier defined position in the given layout.
 * layout: a map of app name => [whichScreen, whichHalf]. See placeWindow().
 */
const applyLayout = (layout) => {
  for (let [appName, properties] of Object.entries(layout)) {
    const app = App.get(appName);
    if (!app)
      continue;
    const windows = app.windows({ visible: true });
    const [whichScreen, whichHalf] = properties;
    for (let window of windows)
      placeWindow(window, whichScreen, whichHalf);
  }
}

// This is an Alfred/Launchbar replacement I've strung together using fzf, Kitty, and some scripting.
const launchFuzzyFinder = () => {
  // Close any existing windows in Kitty, so that one can't hit the fuzzy finder hotkey many times and get
  // overlapping windows.
  let app = App.get("kitty");
  if (app) {
    for (let w of app.windows()) {
      w.close();
    }
  }

  const focusedWindow = Window.focused();
  const screen = focusedWindow ? focusedWindow.screen() : Screen.main();

  Task.run("/bin/bash", ["-c", "/Users/phil/scripts/macos/file-chooser/invoke-kitty.sh &"]);

  // Once the Kitty app has created the fuzzy finder window, center it on the current screen. This has a small
  // amount of latency and thus has some jank. I tried many ways to remove the jank, but it's not possible
  // using an outside->in (Phoenix->Kitty) approach.
  const maxAttempts = 50;
  let attempts = 0;
  let intervalTimer = setInterval(() => {
    attempts++;
    if (attempts > maxAttempts)
      clearInterval(intervalTimer);
    if (!app)
      app = App.get("kitty");
    if (!app)
      return;
    const window = app.windows()[0];
    if (!window)
      return;

    clearInterval(intervalTimer);
    const screenFrame = screen.flippedFrame();
    const windowFrame = window.frame();
    const destOrigin = { x: screenFrame.x + (screenFrame.width - windowFrame.width) / 2,
                         y: screenFrame.y + (screenFrame.height - windowFrame.height) / 2};
    window.setTopLeft(destOrigin);
  }, 20);

};

// Where I generally want my windows.
const windowLayout = {
  "AnyList": [1, "right"],
  "Emacs": [2, "maximized"],
  "Firefox": [1, "right"],
  "Google Chrome": [1, "maximized"],
  "iTerm2": [1, "maximized"],
  "Org": [1, "right"],
  "PowerPoint": [1, "left"],
  "SimpleNote": [1, "right"],
  "Singlebox": [2, "left"],
  "Slack": [1, "right"],
  "Spotify": [2, "left"],
  "SuperHuman": [1, "left"],
  "System Preferences": [1, "left"],
  "Terminal": [1, "left"],
  "WhatsApp": [1, "right"],
  "Xcode": [1, "right"]
};

const myModifiers = ["command", "control"];

// Window placement
Key.on("1", myModifiers, () => placeWindow(Window.focused(), 1, "left"));
Key.on("2", myModifiers, () => placeWindow(Window.focused(), 1, "right"));
Key.on("3", myModifiers, () => placeWindow(Window.focused(), 2, "left"));
Key.on("4", myModifiers, () => placeWindow(Window.focused(), 2, "right"));
Key.on("5", myModifiers, () => centerWindow(Window.focused()));
Key.on("m", myModifiers, () => Window.focused().maximize());
Key.on("'", myModifiers, () => applyLayout(windowLayout));

// Application focusing
Key.on("l", myModifiers, () => launchOrFocus("Google Chrome"));
Key.on("y", myModifiers, () => launchOrFocus("Firefox"));
Key.on("k", myModifiers, () => launchOrFocus("iTerm"));
Key.on("j", myModifiers, () => launchOrFocus("Emacs"));
Key.on("u", myModifiers, () => launchOrFocus("SuperHuman"));
Key.on(",", myModifiers, () => launchOrFocus("Slack"));
Key.on("n", myModifiers, () => launchOrFocus("Terminal"));
Key.on("n", ["command", "control", "shift"], () => launchOrFocus("Spotify"));
Key.on("o", myModifiers, () => launchOrFocus("Org"));
Key.on("c", myModifiers, () => launchOrFocus("Singlebox"));
Key.on("v", myModifiers, () => launchOrFocus("VLC"));
Key.on("a", myModifiers, () => launchOrFocus("Anylist"));
Key.on("s", myModifiers, () => launchOrFocus("SimpleNote"));
Key.on("space", ["command"], launchFuzzyFinder);

// System functions
Key.on("l", ["command", "control", "shift"], lockScreen);
Key.on("9", myModifiers, () => changeVolume(-6));
Key.on("0", myModifiers, () => changeVolume(6));
Key.on("h", ["command", "shift"], hideUnfocusedApps);
Key.on("t", myModifiers, showTime);
