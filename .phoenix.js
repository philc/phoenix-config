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

Key.on("1", ["command", "control"], () => placeWindow(Window.focused(), 1, 0));
Key.on("2", ["command", "control"], () => placeWindow(Window.focused(), 1, 1));
Key.on("3", ["command", "control"], () => placeWindow(Window.focused(), 2, 0));
Key.on("4", ["command", "control"], () => placeWindow(Window.focused(), 2, 1));
Key.on("5", ["command", "control"], () => centerWindow(Window.focused()));
Key.on("m", ["command", "control"], () => maximizeWindow(Window.focused()));
