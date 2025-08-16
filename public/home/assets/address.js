// 路径处理模块
(function() {
    // 从URL中提取路径
    function extractPathFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('file') || '/';
    }

    // 更新URL中的路径
    function updateURLPath(path) {
        if (path === '/') {
            // 如果是根目录，移除路径参数
            const url = new URL(window.location.href);
            url.searchParams.delete('file');
            window.history.replaceState({}, '', url.toString());
        } else {
            // 更新URL中的路径
            const url = new URL(window.location.href);
            url.searchParams.set('file', path);
            window.history.replaceState({}, '', url.toString());
        }
    }

    // 初始化路径处理
    function initializePathHandling() {
        // 页面加载时从URL获取路径
        const initialPath = extractPathFromURL();

        // 如果存在路径，则加载该路径的文件
        if (initialPath !== '/') {
            // 等待文件获取模块初始化
            const checkInterval = setInterval(() => {
                if (window.fileAcquisition && window.fileAcquisition.loadFilesFromServer) {
                    window.fileAcquisition.loadFilesFromServer(initialPath);
                    clearInterval(checkInterval);
                }
            }, 100);
        }

        // 监听文件夹导航事件
        document.addEventListener('filePathChanged', function(event) {
            const newPath = event.detail.path;
            updateURLPath(newPath);
        });
    }

    // 在DOM加载完成后初始化
    document.addEventListener('DOMContentLoaded', initializePathHandling);

    // 暴露接口
    window.pathHandler = {
        extractPathFromURL: extractPathFromURL,
        updateURLPath: updateURLPath
    };
})();
