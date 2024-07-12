function getVideoStates(video: HTMLVideoElement): object {
    return {
        volume: video.volume,
        currentTime: video.currentTime,
        duration: video.duration,
        playbackRate: video.playbackRate,
        paused: video.paused,
        muted: video.muted,
        controls: video.controls
    };
}

window.addEventListener('load', async () => {
    let pageVideos: VideoItem[] = [];

    sendMessageContent({ id: 'reload' });

    class VideoItem {
        element: HTMLVideoElement;
        id: string;
        private thumbnail: string;

        constructor(element: HTMLVideoElement) {
            this.element = element
            this.id = crypto.randomUUID()
            this.thumbnail = null
        }
        async getThumbnail() {
            if (!this.thumbnail) {
                this.thumbnail = (await generateVideoThumnail(this.element));
            }
            return this.thumbnail;
        }
    }

    chrome.runtime.onMessage.addListener(async (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
        console.log(message)
        switch (message.id) {
            case 'initVideos':
                await initAllVideos();
                break;
            case 'updateVideos':
                await updateAllVideos();
                sendPageVideos();
                break;
            case 'controlVideo':
                controlVideoElement(message);
                await sendPageVideos();
                break;
            case 'getVideoAllStates': {
                const element = pageVideos.find(x => x.id == message.videoId).element;
                sendMessageContent({
                    id: 'sendVideoAllStates', videoStates: getVideoStates(element)
                })
                break;
            }
            case 'getVideoState': {
                const element = pageVideos.find(x => x.id == message.videoId).element;
                sendResponse({
                    controlName: message.controlName,
                    value: getVideoStates(element)[message.controlName]
                })
                break;
            }

            default:
                break;
        }
        return true;
    })
    async function sendMessageContent(message: any) {
        console.log(message, new Date())
        await chrome.runtime.sendMessage(message)
            .catch(x => console.error(x));
    }
    async function sendPageVideos() {
        const videoItems = await Promise.all(pageVideos.map(async x => {
            const thumbnail = await x.getThumbnail()
            const element = x.element;
            return {
                id: x.id, thumbnail: thumbnail, details: {
                    src: element.src,
                    resolution: { x: element.videoWidth, y: element.videoHeight },
                    networkState: element.networkState
                }
            }
        }))
        sendMessageContent({ id: 'sendVideos', videoItems: videoItems })
    }

    const observer = new MutationObserver(mutations => {
        console.log('update')
        for (const mutation of mutations) {
            if ([...mutation.addedNodes].find(x => x.nodeType === Node.ELEMENT_NODE && ((x as HTMLElement).tagName == 'VIDEO' || (x as HTMLElement).querySelector('video')))) {
                console.log('videos updated');
                updateAllVideos()
            }
        }
    })
    observer.observe(document.body, { childList: true, subtree: true });

    async function initAllVideos() {
        pageVideos = [...document.querySelectorAll('video')].map(e => new VideoItem(e));
    }

    async function updateAllVideos() {
        const filteredVideos = pageVideos.filter(x => document.contains(x.element));
        pageVideos = [...document.querySelectorAll('video')].map(e => filteredVideos.find(v => e == v.element) ?? new VideoItem(e));
    }

    function controlVideoElement(message: any) {
        const targetVideo = pageVideos.find(x => x.id == message.videoId);
        if (!targetVideo) return console.log('The video is not found : ' + message.videoId);

        const element = targetVideo.element;
        if (!document.contains(element)) {
            updateAllVideos();
            return;
        }
        const value = message.value;
        switch (message.controlName) {
            case 'volume':
                element.volume = value;
                break;
            case 'currentTime':
                element.currentTime = value;
                break;
            case 'playbackRate':
                element.playbackRate = value;
                break;
            case 'paused':
                if (value) {
                    element.pause()
                } else {
                    element.play()
                }
                break;
            case 'muted':
                element.muted = value;
                break;
            case 'requestPictureInPicture':
                element.requestPictureInPicture();
                break;
            case 'controls':
                element.controls = value;
                break;

            default:
                console.log('Invalid type: ' + message.controlName);
                break;
        }
    }

    //video要素からサムネイルを生成
    async function generateVideoThumnail(video: HTMLVideoElement): Promise<string> {
        const canvas = document.createElement('canvas');

        const orgWidth = video.videoWidth;
        const orgHeight = video.videoHeight;
        canvas.width = 128;
        canvas.height = orgHeight * (canvas.width / orgWidth);

        const ctx = canvas.getContext('2d');

        if (!ctx) return;
        // 動画の読み込みが完了したらcanvasに描画
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        if ([1, 2].includes(video.networkState)) { //1: Loading, 2:Idle
            try {
                const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpg'));

                if (!blob) {
                    console.log('Failed to create blob.');
                    return;
                }

                const url = URL.createObjectURL(blob);
                console.log(url);
                return url;
            } catch (e) {
                console.error(e)
            }
        }
        return `http://www.google.com/s2/favicons?domain=${location.hostname}&sz=32`;
    }
})