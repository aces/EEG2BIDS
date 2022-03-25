["Click Here" to return to the project README.md](../../README.md)

["Click Here" to read React Development](react/README.md)

# Development Introduction

 * EEG2BIDS/src - contains the frontend code:
   * Electron used for Multi-OS window rendering.
   * React.js used for GUI components.
   * Socket.io used for messages to python.
 * EEG2BIDS/python - contains the backend code:
   * The main app logic starts in eeg2bids.py.
     * EEG to BIDS libraries used.
     * APIs to a LORIS instance.
   * Socket.io used for messages to the GUI.

## LORIS authentication

 * The GUI stores a user's LORIS credentials securely using [keytar](https://www.npmjs.com/package/keytar).
 * The frontend passes the credentials to python and where they can be reused for refreshing the user's auth token before making LORIS API requests.

## MFF to SET Conversion

* This feature is only supported on a Windows machine and requires some extra dependencies to be installed. 
* The conversion launches a MATLAB execuatble that is OS-specific. The executable (`./tools/mff_to_set.exe`) is committed to this repo using [Git LFS](https://git-lfs.github.com/).
* Dependency: [Matlab Runtime Compiler R2017b (9.3)](https://www.mathworks.com/products/compiler/matlab-runtime.html) for Windows machine

## Things to remember:

 * The development goal is to maintain simple code for new developers to understand and be able to contribute as well.
 * Please comment your code when necessary and possible changes can be requested before merging into the core codebase.
 * Let's build a useful tool together! :)
