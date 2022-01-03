const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const { argv, exit } = require("process");

const os = require("os");

if (os.platform() === "win32") {
  ffmpeg.setFfmpegPath("C:\\ffmpeg\\bin\\ffmpeg.exe");
  ffmpeg.setFfprobePath("C:\\ffmpeg\\bin\\ffprobe.exe");
} else {
  ffmpeg.setFfmpegPath("/usr/bin/ffmpeg");
  ffmpeg.setFfprobePath("/usr/bin/ffprobe");
}

const getDirectories = (path) => {
  return fs.readdirSync(path).filter((file) => {
    return fs.statSync(path + "/" + file).isDirectory();
  });
};

const keypress = async () => {
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once("data", (data) => {
      if (data.toString() === "q") exit();
      process.stdin.setRawMode(false);
      resolve();
    })
  );
};

const processDirectory = async (dir) => {
  return new Promise(async (resolve, reject) => {
    const audioDirectories = getDirectories(mainDir + "/" + dir).filter(
      (subDir) => subDir.includes("audio")
    );
    if (!audioDirectories.length) reject("Error : no audio stream found");

    for (const audioDir of audioDirectories) {
      await new Promise(async (resolveFile) => {
        const fullAudioDir = mainDir + "/" + dir + "/" + audioDir;

        const audioFiles = fs
          .readdirSync(fullAudioDir)
          .filter(
            (file) =>
              file.includes(".aac") | file.includes(".ts") &&
              file.match(/[0-9]{6}/g) &&
              !file.includes("temp")
          );

        let filesProcessced = 0;

        for (const audioFile of audioFiles) {
          let audNumber = audioFile.match(/[0-9]{6}/g)[0];

          const targetFile = fullAudioDir + "/" + "temp-" + audNumber + ".aac";

          await new Promise((resolveProcess) => {
            ffmpeg(fullAudioDir + "/" + audioFile)
              .addOption(["-c aac", "-ac 2"])
              .output(targetFile)
              .on("error", function (err) {
                console.log("An error occurred: " + err.message);
              })
              .on("end", function () {
                console.log(
                  "Files proccessed " +
                    audioFile +
                    " (" +
                    filesProcessced++ +
                    "/" +
                    (audioFiles.length - 1) +
                    ")"
                );

                fs.rmSync(fullAudioDir + "/" + audioFile);
                fs.renameSync(
                  targetFile,
                  fullAudioDir + "/" + audioFile.replace(".ts", ".aac")
                );

                resolveProcess();

                if (filesProcessced - 1 === audioFiles.length - 1)
                  resolveFile();
              })
              .run();
          });
        }

        const m3u8File =
          fullAudioDir +
          "/" +
          fs
            .readdirSync(fullAudioDir)
            .filter((file) => file.includes(".m3u8"))[0];

        fs.writeFileSync(
          m3u8File,
          fs.readFileSync(m3u8File).toString().replace(/\.ts/g, ".aac")
        );
      });
    }
    resolve();
  });
};

const mainDir = argv[2];
const fixedDir = argv[3];

(async () => {
  const directories = fixedDir ? [fixedDir] : getDirectories(mainDir);

  for (const dir of directories) {
    console.log(
      "processing : " + dir + " press any key to continue or q to exit"
    );
    await keypress();

    try {
      await processDirectory(dir);
    } catch (err) {
      console.log(err);
    }
  }
  exit();
})();
