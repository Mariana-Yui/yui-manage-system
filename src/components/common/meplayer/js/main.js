/* eslint-disable indent */
/* eslint-disable no-const-assign */
/* eslint-disable @typescript-eslint/no-use-before-define */
import { THEME_DEFAULT, THEME_MINI } from './constants';
import * as lyric from './lyric';
import * as utils from './utils';
import * as spectrum from './spectrum';
import * as selector from './selector';

// const root =
//     typeof window == 'object' && window.window === window
//         ? window
//         : typeof global == 'object' && global.global === global
//         ? global
//         : this;

// root.
export const mePlayer = function(options) {
    // 检查必填选项
    if (!(options.music && options.music.src)) {
        console.error('必须指定音乐地址哦~');
        return;
    }

    const musicConf = options.music,
        target = selector.$(options.target) || document.querySelector('.meplayer'),
        theme = options.theme || THEME_DEFAULT,
        hasLrc = musicConf.lrc ? true : false,
        coverSrc = musicConf.cover || 'https://unsplash.it/78/?random',
        loop = musicConf.loop || false,
        autoplay = options.autoplay,
        currentThemeClass =
            theme === THEME_DEFAULT ? 'meplayer-container' : 'meplayer-container-mini',
        containerClass = `${currentThemeClass} ${
            hasLrc ? 'meplayer-haslrc' : ''
        } meplayer-isloading`;
    let sources = '';
    if (!Array.isArray(musicConf.src)) musicConf.src = [musicConf.src];
    musicConf.src.forEach((src) => {
        sources += `<source src=${src} type="audio/mp3">\n`;
    });
    const playerHTMLContent = `<div class="${containerClass}">
                             <audio preload="auto">
                             ${sources}
                             </audio>
                             <div class="meplayer-info">
                             <div class="meplayer-info-cover"><img src=${coverSrc} alt="cd-cover"></div>
                             <div class="meplayer-meta">
                             <div class="meplayer-meta-title">${musicConf.title}</div>
                             <div class="meplayer-meta-author">${musicConf.author}</div>
                             <div class="meplayer-meta-time-tick"><span class="meplayer-meta-time-tick-text"></span></div>
                             </div>
                             </div>
                             <canvas class="meplayer-spectrum"></canvas>
                             <div class="meplayer-lyric"><div class="meplayer-lyric-area"></div></div>
                             <div class="meplayer-control"><div class="meplayer-control-play"><i class="icon-play"></i><i class="icon-pause"></i></div></div>
                             <div class="meplayer-volume-bg"><div class="meplayer-volume"><i class="icon-volume"></i><div class="meplayer-volume-progress"></div></div></div>
                             <div class="meplayer-duration"><i class="icon-clock"></i><span class="meplayer-duration-text">loading</span></div>
                             <div class="meplayer-loadingsign"><i class="icon-spin animate-spin"></i>loading</div>
                             <div class="meplayer-timeline-bg"><div class="meplayer-timeline"><div class="meplayer-timeline-passed"></div></div></div>
                             </div>`;

    target.innerHTML = playerHTMLContent;

    const meplayerContainer = target.querySelector(`.${currentThemeClass}`),
        [
            audio,
            playBtn,
            timeTick,
            timeCount,
            timeLine,
            timePassed,
            volumeArea,
            volumeProgress,
            lyricArea,
            canvas
        ] = selector
            .init(meplayerContainer)
            .select([
                'audio',
                '.meplayer-control-play',
                '.meplayer-meta-time-tick-text',
                '.meplayer-duration',
                '.meplayer-timeline',
                '.meplayer-timeline-passed',
                '.meplayer-volume',
                '.meplayer-volume-progress',
                '.meplayer-lyric-area',
                '.meplayer-spectrum'
            ]);
    let duration = 0;

    if (hasLrc) {
        lyric.parse(musicConf.lrc).renderTo(lyricArea);
    } else {
        // 频谱动画初始化
        spectrum.init(canvas);
    }

    eventInit();

    if (autoplay) {
        handlePlayClick();
    }

    // 重定义meplayer
    // root.mePlayer = {
    //     play: play,
    //     pause: pause,
    //     toggleTheme: toggleTheme
    // };

    // 给播放器绑定各种事件
    function eventInit() {
        audio.addEventListener('ended', handleAudioEnd);
        audio.addEventListener('canplaythrough', handleCanPlayThrough);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        playBtn.addEventListener('click', handlePlayClick);
        timeLine.addEventListener('click', handleTimeLineClick);
    }

    function handleAudioEnd() {
        if (loop) {
            audio.play();
        } else {
            utils.removeClass(meplayerContainer, 'meplayer-isplaying');
        }
    }

    function handleCanPlayThrough() {
        duration = this.duration;
        setTimeout(function() {
            utils.removeClass(meplayerContainer, 'meplayer-isloading');
            timeCount.querySelector('.meplayer-duration-text').innerText = utils.parseSec(
                duration.toFixed(0)
            );
        }, 1000);
    }

    function handleDurationChange() {
        duration = this.duration;
    }

    function handleTimeUpdate() {
        const curTime = audio.currentTime;
        const curTimeForLrc = audio.currentTime.toFixed(3);
        const playPercent = 100 * (curTime / duration);

        timePassed.style.width = playPercent.toFixed(2) + '%';
        timeTick.innerText = utils.parseSec(curTime);

        if (hasLrc && theme === THEME_DEFAULT) {
            const tempLrcIndex = lyric.currentIndex(curTimeForLrc);
            const tempLrcLines = lyricArea.querySelectorAll('p');
            const tempLrcLinePre = tempLrcLines[tempLrcIndex - 1];
            const tempLrcLine = tempLrcLines[tempLrcIndex];
            const tempLrcLineNext = tempLrcLines[tempLrcIndex + 1];
            if (!tempLrcLine.className.includes('meplayer-lyric-current')) {
                utils.removeClass(
                    lyricArea.querySelector('.meplayer-lyric-current'),
                    'meplayer-lyric-current'
                );
                if (lyricArea.querySelector('.meplayer-lyric-pre')) {
                    utils.removeClass(
                        lyricArea.querySelector('.meplayer-lyric-pre'),
                        'meplayer-lyric-pre'
                    );
                }
                if (lyricArea.querySelector('.meplayer-lyric-next')) {
                    utils.removeClass(
                        lyricArea.querySelector('.meplayer-lyric-next'),
                        'meplayer-lyric-next'
                    );
                }
                utils.addClass(tempLrcLine, 'meplayer-lyric-current');
                if (tempLrcLinePre) {
                    utils.addClass(tempLrcLinePre, 'meplayer-lyric-pre');
                }
                if (tempLrcLineNext) {
                    utils.addClass(tempLrcLineNext, 'meplayer-lyric-next');
                }

                lyricArea.style.webkitTransform = 'translateY(-' + 20 * tempLrcIndex + 'px)';
                lyricArea.style.transform = 'translateY(-' + 20 * tempLrcIndex + 'px)';
            }
        }
    }

    function handlePlayClick() {
        let _handleMouseWheel;

        if (audio.paused) {
            audio.play();
            if (theme === THEME_DEFAULT && !hasLrc) {
                spectrum.draw();
            }
            // 播放状态中可以用滑轮调节音量
            meplayerContainer.addEventListener(
                'mousewheel',
                (function handleMouseWheel() {
                    let timer = null;
                    const step = 0.05;
                    _handleMouseWheel = function(event) {
                        if (timer) {
                            clearTimeout(timer);
                        }
                        if (!meplayerContainer.className.includes('meplayer-adjusting-volume')) {
                            utils.addClass(meplayerContainer, 'meplayer-adjusting-volume');
                        }
                        if (event.wheelDeltaY < 0 && audio.volume > step) {
                            audio.volume -= step;
                        }
                        if (event.wheelDeltaY > 0 && audio.volume < 1 - step) {
                            audio.volume += step;
                        }
                        if (theme === THEME_DEFAULT) {
                            volumeProgress.style.width = audio.volume * 100 + '%';
                        } else {
                            volumeArea.querySelector('i').style.opacity = audio.volume;
                        }
                        event.preventDefault();

                        timer = setTimeout(function() {
                            utils.removeClass(meplayerContainer, 'meplayer-adjusting-volume');
                        }, 1000);
                    };
                    return _handleMouseWheel;
                })()
            );
        } else {
            audio.pause();
            spectrum.stop();
            meplayerContainer.removeEventListener('mousewheel', _handleMouseWheel);
        }
        utils.toggleClass(meplayerContainer, 'meplayer-isplaying');
    }

    function handleTimeLineClick() {
        const clickPercent = (event.pageX - utils.getAbsLeft(this)) / this.offsetWidth;
        timePassed.style.width = clickPercent * 100 + '%';
        audio.currentTime = (clickPercent * duration).toFixed(0);
    }

    function play() {
        if (audio.paused) {
            utils.addClass(meplayerContainer, 'meplayer-isplaying');
            audio.play();
        }
    }

    function pause() {
        if (!audio.paused) {
            utils.removeClass(meplayerContainer, 'meplayer-isplaying');
            audio.pause();
        }
    }

    function toggleTheme() {
        let step = 0.03;
        let count = 0;
        const maxCount = 200;

        utils.addClass(meplayerContainer, 'meplayer-changing-theme');

        theme = theme === THEME_DEFAULT ? THEME_MINI : THEME_DEFAULT;

        loop();

        function loop() {
            count++;
            meplayerContainer.style.opacity -= step;
            if (meplayerContainer.style.opacity <= 0) {
                step *= -1;
                meplayerContainer.style.opacity = 0;
                utils.toggleClass(meplayerContainer, 'meplayer-container-mini');
                utils.toggleClass(meplayerContainer, 'meplayer-container');
            }
            if (meplayerContainer.style.opacity < 1 && count < maxCount) {
                requestAnimationFrame(loop);
            } else {
                setTimeout(function() {
                    utils.removeClass(meplayerContainer, 'meplayer-changing-theme');
                }, 500);
            }
        }
    }
};

// if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
//     module.exports = root.mePlayer;
// }
