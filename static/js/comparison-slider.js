(function () {
  const BASE = 'videos/';
  const PLAYBACK_RATE = 1.5;

  function applyPlaybackRate(videos) {
    videos.forEach((v) => { v.playbackRate = PLAYBACK_RATE; });
  }

  function waitMetadata(videos) {
    return Promise.all(
      videos.map((v) =>
        new Promise((res) => {
          if (v.readyState >= 1) res();
          else v.addEventListener('loadedmetadata', res, { once: true });
        })
      )
    );
  }

  function startVideos(videos) {
    applyPlaybackRate(videos);
    videos.forEach((v) => { v.currentTime = 0; });
    // 三路同时 play，不依赖事件联动
    videos.forEach((v) => v.play().catch(() => {}));
  }

  function initCompareSlider(root) {
    const leftVid  = root.querySelector('.compare-video-left');
    const rightVid = root.querySelector('.compare-video-right');
    const handle   = root.querySelector('.compare-handle');
    const line     = root.querySelector('.compare-line');
    if (!leftVid || !rightVid || !handle || !line) return;

    const panel    = root.closest('.comparison-panel');
    const inputVid = panel
      ? panel.parentElement.querySelector('.compare-input-video')
      : null;
    const videos = [leftVid, rightVid, inputVid].filter(Boolean);

    let dragging = false;
    let pos = 50;

    function setPosition(p) {
      pos = Math.max(0, Math.min(100, p));
      rightVid.style.clipPath = `inset(0 0 0 ${pos}%)`;
      handle.style.left = `${pos}%`;
      line.style.left   = `${pos}%`;
    }

    function togglePlay() {
      const anyPlaying = videos.some((v) => !v.paused);
      videos.forEach((v) =>
        anyPlaying ? v.pause() : v.play().catch(() => {})
      );
    }

    function onMove(clientX) {
      const rect = root.getBoundingClientRect();
      setPosition(((clientX - rect.left) / rect.width) * 100);
    }

    // --- 鼠标拖拽 ---
    handle.addEventListener('mousedown', (e) => { dragging = true; e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (dragging) onMove(e.clientX); });
    window.addEventListener('mouseup',   () => { dragging = false; });

    // --- 触摸拖拽 ---
    handle.addEventListener('touchstart', (e) => { dragging = true; e.preventDefault(); }, { passive: false });
    window.addEventListener('touchmove',  (e) => { if (dragging && e.touches[0]) onMove(e.touches[0].clientX); });
    window.addEventListener('touchend',   () => { dragging = false; });

    // --- 点击切换播放 ---
    root.addEventListener('click', (e) => {
      if (e.target === handle || handle.contains(e.target)) return;
      togglePlay();
    });

    // --- 同步 pause（不做 seek 同步，避免卡顿）---
    videos.forEach((v) => {
      v.addEventListener('pause', () => {
        if (videos.every((o) => o.paused || o === v)) return;
        videos.forEach((o) => o.pause());
      });
    });

    setPosition(50);
    waitMetadata(videos).then(() => startVideos(videos));
  }

  document.querySelectorAll('.compare-slider').forEach(initCompareSlider);

  // --- Tab 切换 ---
  document.querySelectorAll('.clip-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('is-active')) return;

      document.querySelectorAll('.clip-tab').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');

      const c   = btn.dataset.clip;
      const row = document.querySelector('.comparison-row');
      if (!row || !c) return;

      row.dataset.clip = c;
      row.querySelector('.compare-input-video').src  = BASE + c + '/rgb.mp4';
      row.querySelector('.compare-video-left').src   = BASE + c + '/mask.mp4';
      row.querySelector('.compare-video-right').src  = BASE + c + '/alpha.mp4';

      const videos = Array.from(row.querySelectorAll('video'));
      videos.forEach((v) => v.load());
      waitMetadata(videos).then(() => startVideos(videos));
    });
  });
})();