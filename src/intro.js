const mountIntroScreen = () => `
<div class="intro-outer">
    <div class="intro">
        <h2>Farm Games Wiki</h2>
        <div class="intro-intro">
            <button id="first-enter-btn">Ready to rock?</button>
        </div>
        <div class="actual-intro">
            <video controls="false" muted loop id="intro-video" src="/intro.mp4"></video>
            <audio loop id="intro-audio" src="/intro.mp3"></audio>

            <button id="enter-btn">Enter</button>
        </div>

        <script>
            const milliseconds = (h, m, s) => ((h*60*60+m*60+s)*1000)
            const twelveHours = milliseconds(12, 0, 0)
            const lastDissmissedString = localStorage.getItem("dismissed-intro")
            const lastDismissedDate = lastDissmissedString ? new Date(Number(lastDissmissedString)) : false
            const hasNotDismissedInTheLastTwelveHours = !lastDismissedDate || (new Date().getTime() - lastDismissedDate.getTime() > twelveHours)
            const hasDismissed = !hasNotDismissedInTheLastTwelveHours

            const introIntro = document.querySelector('.intro-intro');
            const firstEnterButton = document.getElementById('first-enter-btn');
            const actualIntro = document.querySelector('.actual-intro');
            const introVideo = document.getElementById('intro-video');
            const introAudio = document.getElementById('intro-audio');
            const enterButton = document.getElementById('enter-btn');

            introAudio.volume = 0.25;

            const enterSite = (shouldNotSetDismissedTime) => {
                introVideo.pause();
                introAudio.pause();
                if (!shouldNotSetDismissedTime) {
                    localStorage.setItem("dismissed-intro", new Date().getTime());
                }
                document.querySelector('.intro-outer').style.display = 'none';
            };

            if (hasDismissed) {
                enterSite(true);
            }

            const startIntro = () => {
                introVideo.play();
                introAudio.play();
                introAudio.volume = 0.25;
                introVideo.addEventListener('ended', () => {
                    introVideo.currentTime = 0;
                    introVideo.play();
                });
                introAudio.addEventListener('ended', () => {
                    introAudio.currentTime = 0;
                    introAudio.play();
                });
                introIntro.style.display = 'none';
                actualIntro.style.display = 'flex';
            };

            enterButton.addEventListener('click', enterSite);
            firstEnterButton.addEventListener('click', startIntro);
        </script>
    </div>
</div>
`

exports.mountIntroScreen = mountIntroScreen;