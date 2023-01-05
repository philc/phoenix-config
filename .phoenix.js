console.log("-----------------------------\n");

// TODO(philc)
Phoenix.set({
  daemon: false,
  openAtLogin: false
})

const w = Window.focused();

const printObject = (o) => {
  const s = [o.toString()];
  for (let k in o) {
    let value = o[k];
    if (typeof(value) == "function")
      value = "fn";
    s.push(`  ${k}: ${value}`);
  }
  return s.join("\n");
}

const getSortedScreens = () => {
  return Screen.all().sort((a, b) => a.flippedFrame().x - b.flippedFrame().x);
}

const placeWindow = (window, whichScreen, whichHalf) => {
  const screen = getSortedScreens()[whichScreen];
  const frame = screen.flippedFrame();
  const width = frame.width / 2 ;
  const x = frame.x + (whichHalf == 1 ? width : 0);
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

const maximizeWindow = (window) => {
  const frame = window.screen().flippedFrame();
  const destFrame = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
  window.setFrame(destFrame);
};

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

const myModifiers = ["command", "control"];

Key.on("1", myModifiers, () => placeWindow(Window.focused(), 1, 0));
Key.on("2", myModifiers, () => placeWindow(Window.focused(), 1, 1));
Key.on("3", myModifiers, () => placeWindow(Window.focused(), 2, 0));
Key.on("4", myModifiers, () => placeWindow(Window.focused(), 2, 1));
Key.on("5", myModifiers, () => centerWindow(Window.focused()));
Key.on("m", myModifiers, () => maximizeWindow(Window.focused()));

Key.on("l", myModifiers, () => launchOrFocus("Google Chrome"));
Key.on("y", myModifiers, () => launchOrFocus("Firefox"));
