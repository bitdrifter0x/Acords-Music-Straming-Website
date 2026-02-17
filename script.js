
const jsmediatags = window.jsmediatags;

// Helper to format duration into mm:ss(g)
function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

// Fetch album folders (g)
async function getAlbumFolders() {
  const res = await fetch("/albums.json");   // ✅ fetch JSON manifest instead
  const data = await res.json();
  return data.albums.map(album => album.name);  // ✅ return album names from JSON

}




// Fetch files inside a specific album (g)
async function getFiles(albumName) {
  const res = await fetch("/albums.json");   // ✅ use same manifest
  const data = await res.json();
  const album = data.albums.find(a => a.name === albumName);
  return album ? album.songs : [];           // ✅ return song URLs

}



// Extract song metadata (g)
async function getSongInfo(fileUrl) {
  return new Promise(async resolve => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();

      const audio = new Audio(fileUrl);
      audio.addEventListener("loadedmetadata", () => {
        const duration = audio.duration;

        jsmediatags.read(blob, {
          onSuccess: tag => {
            let cover = null;
            if (tag.tags.picture) {
              const picture = tag.tags.picture;
              let base64String = "";
              for (let i = 0; i < picture.data.length; i++) {
                base64String += String.fromCharCode(picture.data[i]);
              }
              cover = `data:${picture.format};base64,${btoa(base64String)}`;
            }
            resolve({
              cover: cover,
              name: tag.tags.title || fileUrl.split("/").pop(),
              artist: tag.tags.artist || "Unknown Artist",
              duration: formatDuration(duration),
              file: fileUrl
            });
          },
          onError: () => {
            resolve({
              name: fileUrl.split("/").pop(),
              artist: "Unknown Artist",
              duration: formatDuration(duration),
              file: fileUrl
            });
          }
        });
      });
    } catch (err) {
      console.error("Error fetching file:", err);
      resolve({
        name: fileUrl.split("/").pop(),
        artist: "Unknown Artist",
        duration: "00:00",
        file: fileUrl
      });
    }
  });
}



// Build album cards (g)
async function loadAlbums() {
  const albums = await getAlbumFolders();
  const container = document.querySelector(".cards");
  container.innerHTML = "";

  albums.forEach(album => {
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.className = "imgalbum";
    img.src = `/albums/${album}/cover.jpg`;   // ✅ relative path

    const titleEl = document.createElement("h4");
    titleEl.textContent = album.split("-")[0].trim();

    const artistEl = document.createElement("p");
    artistEl.textContent = album.includes("-") ? album.split("-")[1].trim() : "Unknown Artist";

    card.appendChild(img);
    card.appendChild(titleEl);
    card.appendChild(artistEl);

    container.appendChild(card);

    card.addEventListener("click", () => {
      loadSongsFromAlbum(album);
      setTimeout(() => { document.querySelector(".right").classList.remove("active");   
      }, 200); // wait 300ms before closing

    });
  });
}


// Build songs list for a chosen album (g)
async function loadSongsFromAlbum(albumName) {
  try {
    const files = await getFiles(albumName);
    const infos = await Promise.all(files.map(f => getSongInfo(f)));

    playlist = infos;

    const container = document.querySelector(".contdes"); // parent div
    container.innerHTML = "";

    infos.forEach(song => {
      // Create wrapper
      const cdes = document.createElement("div");
      cdes.className = "cdes flex";

      // Cover icon
      const img = document.createElement("img");
      img.id = "mu";
      img.src = "/img/music-track.png";

      // Text block
      const textBlock = document.createElement("div");
      const titleEl = document.createElement("h3");
      const shortTitle = song.name.split(/[-(]/)[0].trim();
      titleEl.textContent = shortTitle;
      
      const artistEl = document.createElement("p");
      const firstArtist = song.artist.split(/[-(,]/)[0].trim();

      artistEl.textContent = firstArtist;
      textBlock.appendChild(titleEl);
      textBlock.appendChild(artistEl);

      // Duration
      const durationEl = document.createElement("p");
      durationEl.textContent = song.duration;

      // Assemble
      cdes.appendChild(img);
      cdes.appendChild(textBlock);
      cdes.appendChild(durationEl);

    // Add click listener here
    cdes.addEventListener("click", () => {
        currentSongIndex = infos.indexOf(song); // track index
        playSong(song); // call helper function

    });

      container.appendChild(cdes);
    });
  } catch (err) {
    console.error("Error loading songs:", err);
  }


// playing song controls
  function playSong(song) {
    // Format name and artist like in the list view
    const shortTitle = song.name.split(/[-(]/)[0].trim();
    const firstArtist = song.artist.split(/[-(,]/)[0].trim();

    document.querySelector("#playsong").src = song.cover || "/img/music-track.png";
    document.querySelector(".songtitle h4").textContent = shortTitle;
    document.querySelector(".songtitle p").textContent = firstArtist;

    // Reset seek bar and times
    const seekBar = document.getElementById("seekBar");
    const currentTimeEl = document.getElementById("currentTime");
    const totalTimeEl = document.getElementById("totalTime");
    seekBar.value = 0;
    currentTimeEl.textContent = "00:00";
    totalTimeEl.textContent = "00:00";

    // Set source BEFORE play
    player.src = song.file;

    // Update total duration once metadata is loaded
    player.addEventListener("loadedmetadata", () => {
      seekBar.max = Math.floor(player.duration);
      totalTimeEl.textContent = formatTime(player.duration);
    }, { once: true }); // attach once per song

    // Update current time as song plays
    player.addEventListener("timeupdate", () => {
      seekBar.value = Math.floor(player.currentTime);
      currentTimeEl.textContent = formatTime(player.currentTime);
      const percent = (player.currentTime / player.duration) * 100;
      document.getElementById("seekBar").style.setProperty("--progress", `${percent}%`);

    });

    // Seek when user drags slider
    seekBar.addEventListener("input", () => {
      player.currentTime = seekBar.value;
    });

    player.play();

    // Reset play button UI
    const playBtn = document.querySelector('.songcontrols .buttons img:nth-child(2)');
    playBtn.src = "/img/pause.png";
  }

  // Helper function
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  player.addEventListener("timeupdate", () => {
    const percent = (player.currentTime / player.duration) * 100;
    document.getElementById("seekBar").style.setProperty("--progress", `${percent}%`);
  });

  const prevBtn = document.querySelector('.songcontrols .buttons img:nth-child(1)');
  const playBtn = document.querySelector('.songcontrols .buttons img:nth-child(2)');
  const nextBtn = document.querySelector('.songcontrols .buttons img:nth-child(3)');

  playBtn.addEventListener("click", () => {
    if (player.paused) {
      player.play();
      playBtn.src = "/img/pause.png";
    } else {
      player.pause();
      playBtn.src = "/img/play-button-arrowhead.png";
    }
  });

  prevBtn.addEventListener("click", () => {
    if (currentSongIndex > 0) {
      currentSongIndex--;
      playSong(playlist[currentSongIndex]);
    }
  });

  nextBtn.addEventListener("click", () => {
    if (currentSongIndex < playlist.length - 1) {
      currentSongIndex++;
      playSong(playlist[currentSongIndex]);
    }
  });

}



// function call loadAlbums
loadAlbums();


// audio track navigation
let player = new Audio();
let playlist = [];        
let currentSongIndex = -1;

// auto move to next song after complete
player.addEventListener("ended", () => {
  if (currentSongIndex < playlist.length - 1) {
    currentSongIndex++;
    playSong(playlist[currentSongIndex]);
  }
});

// volume adjustment
const volumeBar = document.getElementById("volumeBar");

volumeBar.addEventListener("input", () => {
  player.volume = volumeBar.value;

  // Update slider fill
  const percent = volumeBar.value * 100;
  volumeBar.style.background = `linear-gradient(to right, #fff ${percent}%, rgba(31, 39, 150, 0.485) ${percent}%)`;
});



// stopping page to reload on search
document.getElementById('searchForm').addEventListener('submit', function(event) {
        // 1. Stop the page from reloading
        event.preventDefault();
        
});



//slide transition on mobile

const addBtn = document.getElementById("add");
const rightPanel = document.querySelector(".right");

addBtn.addEventListener("click", () => {
  rightPanel.classList.toggle("active");
});



const closeBtn = document.getElementById("back");
closeBtn.addEventListener("click", () => {
  rightPanel.classList.remove("active");
});






























