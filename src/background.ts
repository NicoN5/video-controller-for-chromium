chrome.runtime.onMessage.addListener((message: any) => {
    switch (message.id) {
        case 'log':
            console.log(message.message, message.source);
            break;
    }
})