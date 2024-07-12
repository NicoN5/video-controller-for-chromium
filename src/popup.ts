// let videoIds: string[] = []
let videoItems: VideoItemsPopup[] = []
let currentVideoId: string | undefined = null;

class VideoItemsPopup {
    id: string;
    thumbnail: string;
    details: { resolution: { x: number, y: number }, src: string, networkState: number };
    constructor(id: string, thumbnail: string, details: any) {
        this.id = id;
        this.thumbnail = thumbnail;
        this.details = details;
    }
}

enum ControlName {
    volume = 'volume',
    currentTime = 'currentTime',
    playbackRate = 'playbackRate',
    paused = 'paused',
    muted = 'muted',
    requestPictureInPicture = 'requestPictureInPicture',
    controls = 'controls'
}
class VideoController {
    readonly element: HTMLElement;
    readonly controlName: ControlName;
    private static videoControllers: VideoController[] = [];

    constructor(controlName: ControlName, element: HTMLElement, className: string = '') {
        this.controlName = controlName;
        this.element = element;
        this.element.className = className;
        VideoController.videoControllers.push(this)
    }

    static allReflesh() {
        this.videoControllers.forEach(v => v.refleshState());
    }
    refleshState() { };
}
class VideoButtonController extends VideoController {
    constructor(controlName: ControlName) {
        super(controlName, document.createElement('div'));

        this.element.classList.add('controller-button');
        this.element.onclick = this.onClick.bind(this);

        document.querySelector('#detail-buttons').appendChild(this.element);
    }
    onClick() { console.log('unextended') };
}
class VToggleController extends VideoButtonController {
    isOn: boolean;

    onIconURL: string;
    offIconURL: string;

    constructor(controlName: ControlName, onIconURL: string, offIconURL: string) {
        super(controlName);
        this.onIconURL = onIconURL;
        this.offIconURL = offIconURL;
    }
    async onClick() {
        await controlVideo(this.controlName.toString(), !this.isOn);
        this.refleshState();
    }
    async refleshState() {
        if (!currentVideoId) return;
        chrome.tabs.sendMessage(await getCurrentTabId(), { id: 'getVideoState', videoId: currentVideoId, controlName: this.controlName.toString() }, (response) => {
            this.isOn = response.value;
            this.element.style.backgroundImage = `url('${this.isOn ? this.onIconURL : this.offIconURL}')`;
            console.log(`${response.controlName} ${response.value}`);
        })
    }
}
class VTriggerController extends VideoButtonController {
    constructor(controlName: ControlName, iconURL: string) {
        super(controlName)

        this.element.style.backgroundImage = `url('${iconURL}')`;
    }
    onClick() {
        console.log(`${this.controlName} ${this.element?.tagName} ${currentVideoId}`);
        controlVideo(this.controlName.toString(), null);
    }
}

sendMessagePopup('popup loaded');

window.addEventListener('load', () => Run());
async function Run() {
    const videoList = document.querySelector('#video-list') as HTMLDivElement;
    const videoContainer = document.querySelector('#video-container') as HTMLDivElement;
    const videoDetail = document.querySelector('#video-detail') as HTMLDivElement;
    const currentTimeSlider = document.querySelector('#currentTime-range') as HTMLInputElement;
    const volumeSlider = document.querySelector('#volume-range') as HTMLInputElement;
    const playbackRateSlider = document.querySelector('#playbackRate-range') as HTMLInputElement;
    const backButton = document.querySelector('#back-button') as HTMLButtonElement;
    const controllerUpdateButton = document.querySelector('#controller-update-button') as HTMLButtonElement;
    const controllerPausedToggle = new VToggleController(ControlName.paused,
        /* Play https://heroicons.com/ */"data:image/svg+xml;base64,CiAgICAgICAgICAgIDxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiCiAgICAgICAgICAgICAgICBmaWxsPSJjdXJyZW50Q29sb3IiIGNsYXNzPSJzaXplLTYiPgogICAgICAgICAgICAgICAgPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIgogICAgICAgICAgICAgICAgICAgIGQ9Ik00LjUgNS42NTNjMC0xLjQyNyAxLjUyOS0yLjMzIDIuNzc5LTEuNjQzbDExLjU0IDYuMzQ3YzEuMjk1LjcxMiAxLjI5NSAyLjU3MyAwIDMuMjg2TDcuMjggMTkuOTljLTEuMjUuNjg3LTIuNzc5LS4yMTctMi43NzktMS42NDNWNS42NTNaIgogICAgICAgICAgICAgICAgICAgIGNsaXAtcnVsZT0iZXZlbm9kZCIgLz4KICAgICAgICAgICAgPC9zdmc+",
        /* Pause */"data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIKICAgICAgICAgICAgICAgIGZpbGw9ImN1cnJlbnRDb2xvciIgY2xhc3M9InNpemUtNiI+CiAgICAgICAgICAgICAgICA8cGF0aCBmaWxsLXJ1bGU9ImV2ZW5vZGQiCiAgICAgICAgICAgICAgICAgICAgZD0iTTYuNzUgNS4yNWEuNzUuNzUgMCAwIDEgLjc1LS43NUg5YS43NS43NSAwIDAgMSAuNzUuNzV2MTMuNWEuNzUuNzUgMCAwIDEtLjc1Ljc1SDcuNWEuNzUuNzUgMCAwIDEtLjc1LS43NVY1LjI1Wm03LjUgMEEuNzUuNzUgMCAwIDEgMTUgNC41aDEuNWEuNzUuNzUgMCAwIDEgLjc1Ljc1djEzLjVhLjc1Ljc1IDAgMCAxLS43NS43NUgxNWEuNzUuNzUgMCAwIDEtLjc1LS43NVY1LjI1WiIKICAgICAgICAgICAgICAgICAgICBjbGlwLXJ1bGU9ImV2ZW5vZGQiIC8+CiAgICAgICAgICAgIDwvc3ZnPg=="
    )
    const controllerMutedToggle = new VToggleController(ControlName.muted,
        /* UnMute */"data:image/svg+xml;base64,CiAgICAgICAgICAgIDxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiCiAgICAgICAgICAgICAgICBmaWxsPSJjdXJyZW50Q29sb3IiIGNsYXNzPSJzaXplLTYiPgogICAgICAgICAgICAgICAgPHBhdGgKICAgICAgICAgICAgICAgICAgICBkPSJNMTMuNSA0LjA2YzAtMS4zMzYtMS42MTYtMi4wMDUtMi41Ni0xLjA2bC00LjUgNC41SDQuNTA4Yy0xLjE0MSAwLTIuMzE4LjY2NC0yLjY2IDEuOTA1QTkuNzYgOS43NiAwIDAgMCAxLjUgMTJjMCAuODk4LjEyMSAxLjc2OC4zNSAyLjU5NS4zNDEgMS4yNCAxLjUxOCAxLjkwNSAyLjY1OSAxLjkwNWgxLjkzbDQuNSA0LjVjLjk0NS45NDUgMi41NjEuMjc2IDIuNTYxLTEuMDZWNC4wNlpNMTcuNzggOS4yMmEuNzUuNzUgMCAxIDAtMS4wNiAxLjA2TDE4LjQ0IDEybC0xLjcyIDEuNzJhLjc1Ljc1IDAgMSAwIDEuMDYgMS4wNmwxLjcyLTEuNzIgMS43MiAxLjcyYS43NS43NSAwIDEgMCAxLjA2LTEuMDZMMjAuNTYgMTJsMS43Mi0xLjcyYS43NS43NSAwIDEgMC0xLjA2LTEuMDZsLTEuNzIgMS43Mi0xLjcyLTEuNzJaIiAvPgogICAgICAgICAgICA8L3N2Zz4=",
        /* Mute https://heroicons.com/ */"data:image/svg+xml;base64,CiAgICAgICAgICAgIDxzdmcgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB2aWV3Qm94PSIwIDAgMjQgMjQiCiAgICAgICAgICAgICAgICBmaWxsPSJjdXJyZW50Q29sb3IiIGNsYXNzPSJzaXplLTYiPgogICAgICAgICAgICAgICAgPHBhdGgKICAgICAgICAgICAgICAgICAgICBkPSJNMTMuNSA0LjA2YzAtMS4zMzYtMS42MTYtMi4wMDUtMi41Ni0xLjA2bC00LjUgNC41SDQuNTA4Yy0xLjE0MSAwLTIuMzE4LjY2NC0yLjY2IDEuOTA1QTkuNzYgOS43NiAwIDAgMCAxLjUgMTJjMCAuODk4LjEyMSAxLjc2OC4zNSAyLjU5NS4zNDEgMS4yNCAxLjUxOCAxLjkwNSAyLjY1OSAxLjkwNWgxLjkzbDQuNSA0LjVjLjk0NS45NDUgMi41NjEuMjc2IDIuNTYxLTEuMDZWNC4wNlpNMTguNTg0IDUuMTA2YS43NS43NSAwIDAgMSAxLjA2IDBjMy44MDggMy44MDcgMy44MDggOS45OCAwIDEzLjc4OGEuNzUuNzUgMCAwIDEtMS4wNi0xLjA2IDguMjUgOC4yNSAwIDAgMCAwLTExLjY2OC43NS43NSAwIDAgMSAwLTEuMDZaIiAvPgogICAgICAgICAgICAgICAgPHBhdGgKICAgICAgICAgICAgICAgICAgICBkPSJNMTUuOTMyIDcuNzU3YS43NS43NSAwIDAgMSAxLjA2MSAwIDYgNiAwIDAgMSAwIDguNDg2Ljc1Ljc1IDAgMCAxLTEuMDYtMS4wNjEgNC41IDQuNSAwIDAgMCAwLTYuMzY0Ljc1Ljc1IDAgMCAxIDAtMS4wNloiIC8+CiAgICAgICAgICAgIDwvc3ZnPg=="
    )
    const controllerPipButton = new VTriggerController(ControlName.requestPictureInPicture, "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgY2xhc3M9Imljb24gaWNvbi10YWJsZXIgaWNvbi10YWJsZXItcGljdHVyZS1pbi1waWN0dXJlLW9uIiBmaWxsPSJub25lIiBoZWlnaHQ9IjI0IiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBzdHJva2Utd2lkdGg9IjIiIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0wIDBoMjR2MjRIMHoiIGZpbGw9Im5vbmUiIHN0cm9rZT0ibm9uZSIvPjxwYXRoIGQ9Ik0xMSAxOWgtNmEyIDIgMCAwIDEgLTIgLTJ2LTEwYTIgMiAwIDAgMSAyIC0yaDE0YTIgMiAwIDAgMSAyIDJ2NCIvPjxyZWN0IGhlaWdodD0iNSIgcng9IjEiIHdpZHRoPSI3IiB4PSIxNCIgeT0iMTQiLz48bGluZSB4MT0iNyIgeDI9IjExIiB5MT0iOSIgeTI9IjEzIi8+PHBhdGggZD0iTTggMTNoM3YtMyIvPjwvc3ZnPg==")
    const controllerControlsToggle = new VToggleController(ControlName.controls,
        /* CircleSeekbar https://www.iconfinder.com/icons/9054959/bx_slider_alt_icon */ "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcuNSAxNC41Yy0xLjU4IDAtMi45MDMgMS4wNi0zLjMzNyAyLjVIMnYyaDIuMTYzYy40MzQgMS40NCAxLjc1NyAyLjUgMy4zMzcgMi41czIuOTAzLTEuMDYgMy4zMzctMi41SDIydi0ySDEwLjgzN2MtLjQzNC0xLjQ0LTEuNzU3LTIuNS0zLjMzNy0yLjV6bTAgNWMtLjgyNyAwLTEuNS0uNjczLTEuNS0xLjVzLjY3My0xLjUgMS41LTEuNVM5IDE3LjE3MyA5IDE4cy0uNjczIDEuNS0xLjUgMS41em05LTExYy0xLjU4IDAtMi45MDMgMS4wNi0zLjMzNyAyLjVIMnYyaDExLjE2M2MuNDM0IDEuNDQgMS43NTcgMi41IDMuMzM3IDIuNXMyLjkwMy0xLjA2IDMuMzM3LTIuNUgyMnYtMmgtMi4xNjNjLS40MzQtMS40NC0xLjc1Ny0yLjUtMy4zMzctMi41em0wIDVjLS44MjcgMC0xLjUtLjY3My0xLjUtMS41cy42NzMtMS41IDEuNS0xLjUgMS41LjY3MyAxLjUgMS41LS42NzMgMS41LTEuNSAxLjV6Ii8+PHBhdGggZD0iTTEyLjgzNyA1QzEyLjQwMyAzLjU2IDExLjA4IDIuNSA5LjUgMi41UzYuNTk3IDMuNTYgNi4xNjMgNUgydjJoNC4xNjNDNi41OTcgOC40NCA3LjkyIDkuNSA5LjUgOS41czIuOTAzLTEuMDYgMy4zMzctMi41aDkuMjg4VjVoLTkuMjg4ek05LjUgNy41QzguNjczIDcuNSA4IDYuODI3IDggNnMuNjczLTEuNSAxLjUtMS41UzExIDUuMTczIDExIDZzLS42NzMgMS41LTEuNSAxLjV6Ii8+PC9zdmc+",
        /* Seekbar https://www.iconfinder.com/icons/9054837/bx_slider_icon */ "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiA/PjxzdmcgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEzIDVoOXYyaC05ek0yIDdoN3YyaDJWM0g5djJIMnptNyAxMGgxM3YySDl6bTEwLTZoM3YyaC0zem0tMiA0VjkuMDEyaC0yVjExSDJ2MmgxM3Yyek03IDIxdi02SDV2MkgydjJoM3YyeiIvPjwvc3ZnPg==",
    )

    const videolistUpdateButton = document.querySelector('#videolist-update-button') as HTMLButtonElement;

    chrome.runtime.onMessage.addListener((message: any) => {
        chrome.runtime.sendMessage({ id: 'log', message: message, source: 'recieve popup' })
        switch (message.id) {
            case 'sendVideos':
                videoItems = message.videoItems.map(x => new VideoItemsPopup(x.id, x.thumbnail, x.details));
                drawVideoItems();
                break;
            case 'sendVideoAllStates':
                updateVideoStates(message.videoStates);
                break;
            case 'reload':
                location.reload();
                break

            default:
                break;
        }
    })

    sendMessagePopup('open ' + new Date())
    await sendMessagePopup({ id: 'updateVideos' });
    sendMessagePopup('success ' + new Date())
    document.querySelector('#loading-circle').classList.add('hidden');

    currentTimeSlider.addEventListener('input', ev => {
        drawSliders();
    })
    currentTimeSlider.addEventListener('change', ev => {
        controlVideo('currentTime', Number(currentTimeSlider.value));
    })
    volumeSlider.addEventListener('input', () => {
        drawSliders();
        controlVideo('volume', Number(volumeSlider.value) / 100);
    })
    playbackRateSlider.addEventListener('input', () => {
        drawSliders();
        controlVideo('playbackRate', Number(playbackRateSlider.value) / 100 * 2);
    })

    backButton.addEventListener('click', () => {
        videoDetail.style.display = 'none';
        videoList.style.display = 'block';
        currentVideoId = null;
    });
    controllerUpdateButton.addEventListener('click', () => getVideoAllStates());

    videolistUpdateButton.addEventListener('click', () => {
        sendMessagePopup({ id: 'initVideos' });
        location.reload();
    });

    function getVideoAllStates() {
        sendMessagePopup({ id: 'getVideoAllStates', videoId: currentVideoId });
    }
    function updateVideoStates(videoStates: { currentTime: number, duration: number, volume: number, playbackRate: number }) {
        currentTimeSlider.setAttribute('max', String(Math.floor(videoStates.duration)));
        currentTimeSlider.valueAsNumber = Math.floor(videoStates.currentTime);
        volumeSlider.valueAsNumber = Math.floor(videoStates.volume * 100);
        playbackRateSlider.valueAsNumber = Math.floor(videoStates.playbackRate * 50);

        drawSliders();
    }
    function drawSliders() {
        currentTimeSlider.labels[0].textContent = `Time : ${currentTimeSlider.value}/${currentTimeSlider.getAttribute('max')}secs`;
        volumeSlider.labels[0].textContent = `Volume : ${volumeSlider.value}%`;
        playbackRateSlider.labels[0].textContent = `Speed : ${Number(playbackRateSlider.value) * 2}%`;
    }

    drawVideoItems();
    async function drawVideoItems() {
        [...videoContainer.children].forEach(x => x.remove());
        document.querySelector('#video-empty-text').className = videoItems.length === 0 ? '' : 'hidden';
        for (let i = 0; i < videoItems.length; i++) {
            const videoId = videoItems[i].id;
            const details = videoItems[i].details;

            const div = document.createElement('div');
            div.className = 'video-item';
            div.id = videoId;

            const thumbnail = document.createElement('img') as HTMLImageElement;
            thumbnail.src = videoItems[i].thumbnail;
            thumbnail.className = 'video-thumbnail';

            const detail = document.createElement('div');
            detail.className = 'video-detail-container'

            const source = document.createElement('div');
            source.textContent = 'Source: '
            source.className = 'video-detail-item detail-source';
            const srcLink = document.createElement('a');
            srcLink.href = details.src;
            srcLink.textContent = details.src ?? '-';
            srcLink.target = '_blank';
            srcLink.rel = 'noopener noreferrer';
            srcLink.title = details.src;
            source.onclick = (event) => event.stopPropagation(); //親要素へクリックイベントが伝播するのを阻止
            source.appendChild(srcLink);

            const resolution = document.createElement('div');
            resolution.className = 'video-detail-item detail-resolution';
            resolution.textContent = `Resolution: ${details.resolution.x}x${details.resolution.y}`
            resolution.onclick = (event) => event.stopPropagation(); //親要素へクリックイベントが伝播するのを阻止

            const networkState = document.createElement('div');
            networkState.className = 'video-detail-item detail-networkState';
            networkState.textContent = `NetworkState: ${networkStates[details.networkState]}`;
            networkState.onclick = (event) => event.stopPropagation();

            detail.appendChild(source);
            detail.appendChild(resolution);
            detail.appendChild(networkState);

            div.appendChild(thumbnail);
            div.appendChild(detail)
            div.addEventListener('click', () => {
                videoList.style.display = 'none';
                videoDetail.style.display = 'block';
                currentVideoId = videoId;
                getVideoAllStates();
                VideoController.allReflesh();
            })
            videoContainer.appendChild(div);
        }
    }
}
async function sendMessagePopup(message: any) {
    backgroundLog(message);
    await chrome.tabs.sendMessage(await getCurrentTabId(), message);
}
function backgroundLog(message: any) {
    chrome.runtime.sendMessage({ id: 'log', message: message, source: 'send popup' })
}

async function controlVideo(controlName: string, value: any) {
    await sendMessagePopup({ id: 'controlVideo', videoId: currentVideoId, controlName: controlName, value: value })
}

//現在のタブを取得
async function getCurrentTabId() {
    let queryOptions: chrome.tabs.QueryInfo = { active: true, lastFocusedWindow: true };
    // `tab` will either be a `tabs.Tab` instance or `undefined`.
    let [tab] = await chrome.tabs.query(queryOptions);
    return tab.id;
}

const networkStates = [
    'Empty',
    'Idle',
    'Loading',
    'NoSource'
]