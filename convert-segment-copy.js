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
        const tempAudioDir = mainDir + "/" + dir + "/" + audioDir + "-cast";

        if (!fs.existsSync(tempAudioDir)) fs.mkdirSync(tempAudioDir);

        const m3u8File =
          fullAudioDir +
          "/" +
          fs
            .readdirSync(fullAudioDir)
            .filter((file) => file.includes(".m3u8"))[0];

        ffmpeg(m3u8File)
          .outputOptions([
            "-c aac",
            "-ac 2",
            "-f segment",
            "-segment_time 10",
            "-segment_format aac",
            "-segment_list " + tempAudioDir + "/" + audioDir + "_stream.m3u8",
          ])
          .save(tempAudioDir + "/" + audioDir + "_data%06d.aac")
          .on("progress", (progress) => {
            console.log(
              dir +
                " " +
                audioDir +
                " (" +
                Math.round(progress.percent) +
                "%" +
                ")"
            );
          })
          .on("error", function (err) {
            console.log("An error occurred: " + err.message);
          })
          .on("end", function () {
            resolveFile();
          });
      }).catch((err) => console.log(err));
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
