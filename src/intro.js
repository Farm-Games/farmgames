const mountIntroScreen = () => `
<div class="intro-outer">
    <div class="intro">
        <h2>Farm Games Wiki</h2>
        <video controls="false" autoplay muted loop id="intro-video" src="/intro.mp4"></video>
        <audio autoplay loop id="intro-audio" src="/intro.mp3"></audio>

        <button id="enter-btn">Enter</button>

        <script>
            const milliseconds = (h, m, s) => ((h*60*60+m*60+s)*1000)
            const twelveHours = milliseconds(12, 0, 0)
            const lastDissmissedString = localStorage.getItem("dismissed-intro")
            const lastDismissedDate = lastDissmissedString ? new Date(Number(lastDissmissedString)) : false
            const hasNotDismissedInTheLastTwelveHours = !lastDismissedDate || (new Date().getTime() - lastDismissedDate.getTime() > twelveHours)
            const hasDismissed = !hasNotDismissedInTheLastTwelveHours
            const introVideo = document.getElementById('intro-video');
            const introAudio = document.getElementById('intro-audio');
            const enterButton = document.getElementById('enter-btn');
            introAudio.volume = 0.25;

            const enterSite = () => {
                introVideo.pause();
                introAudio.pause();
                localStorage.setItem("dismissed-intro", new Date().getTime());
                document.querySelector('.intro-outer').style.display = 'none';
            };

            if (hasDismissed) {
                enterSite();
            }

            document.addEventListener('keydown', enterSite);
            enterButton.addEventListener('click', enterSite);
        </script>
    </div>
</div>
`

exports.mountIntroScreen = mountIntroScreen;