// 检测是否为移动设备 - 将其定义为全局函数
function isMobileDevice() {
    return (window.innerWidth <= 767) || 
           (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
}

// 移动设备检测与适配
document.addEventListener('DOMContentLoaded', function() {
    // 根据设备类型添加不同的类名
    if (isMobileDevice()) {
        document.body.classList.add('mobile-device');
        document.body.classList.add('mobile-layout');
        
        // 在移动设备上隐藏拖拽上传区域
        const dropzoneContainer = document.querySelector('.upload-dropzone-container');
        if (dropzoneContainer) {
            dropzoneContainer.style.display = 'none';
        }
        
        // 添加移动端手势支持
        initMobileGestures();
    }
    
    // 窗口大小变化时重新检测
    window.addEventListener('resize', function() {
        if (isMobileDevice()) {
            document.body.classList.add('mobile-device');
            document.body.classList.add('mobile-layout');
            
            // 在移动设备上隐藏拖拽上传区域
            const dropzoneContainer = document.querySelector('.upload-dropzone-container');
            if (dropzoneContainer) {
                dropzoneContainer.style.display = 'none';
            }
            
            // 添加移动端手势支持
            initMobileGestures();
        } else {
            document.body.classList.remove('mobile-device');
            document.body.classList.remove('mobile-layout');
            
            // 在桌面设备上显示拖拽上传区域
            const dropzoneContainer = document.querySelector('.upload-dropzone-container');
            if (dropzoneContainer) {
                dropzoneContainer.style.display = 'block';
            }
        }
    });
    
    // 初始化移动端手势
    function initMobileGestures() {
        const uploadScreen = document.getElementById('upload-screen');
        const uploadHeader = uploadScreen ? uploadScreen.querySelector('.upload-header') : null;
        const overlay = document.getElementById('overlay');
        
        if (!uploadScreen || !uploadHeader) return;
        
        let startY = 0;
        let currentY = 0;
        let isSwiping = false;
        
        // 添加触摸开始事件
        uploadHeader.addEventListener('touchstart', function(e) {
            startY = e.touches[0].clientY;
            currentY = startY;
            isSwiping = true;
        });
        
        // 添加触摸移动事件
        uploadHeader.addEventListener('touchmove', function(e) {
            if (!isSwiping) return;
            
            currentY = e.touches[0].clientY;
            const deltaY = currentY - startY;
            
            // 只有向下滑动才响应
            if (deltaY > 0) {
                // 设置上传窗口的位置
                uploadScreen.style.transform = `translateY(${deltaY}px)`;
                
                // 调整遮罩层的透明度
                if (overlay) {
                    const opacity = Math.max(0.1, 1 - (deltaY / 300));
                    overlay.style.opacity = opacity.toString();
                }
            }
        });
        
        // 添加触摸结束事件
        uploadHeader.addEventListener('touchend', function(e) {
            if (!isSwiping) return;
            
            isSwiping = false;
            const deltaY = currentY - startY;
            
            if (deltaY > 80) {
                // 滑动距离足够，关闭窗口
                closeUploadScreen();
            } else {
                // 滑动距离不够，恢复窗口位置
                uploadScreen.style.transform = '';
                if (overlay) {
                    overlay.style.opacity = '1';
                }
            }
        });
        
        // 关闭上传窗口函数
        function closeUploadScreen() {
            uploadScreen.style.transform = '';
            uploadScreen.classList.remove('active');
            
            if (overlay) {
                overlay.style.display = 'none';
                overlay.style.opacity = '1';
            }
            
            // 如果存在重置选中文件的函数，调用它
            if (window.resetSelectedFiles) {
                window.resetSelectedFiles();
            }
        }
    }
});

// 递归渲染文件夹结构
function renderFolderStructure(folder, container, level) {
    // 先处理文件
    folder.files.forEach(file => {
        // 创建文件项
        const fileItem = document.createElement('div');
        fileItem.className = 'nested-file-item';
        fileItem.style.paddingLeft = (level * 15) + 'px';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';

        const iconSvg = createSvgElement(getFileIcon(file.name));
        fileIcon.appendChild(iconSvg);
        
        const fileName = document.createElement('span');
        fileName.textContent = file.name;
        
        fileItem.appendChild(fileIcon);
        fileItem.appendChild(fileName);
        
        container.appendChild(fileItem);
    });
    
    // 再处理子文件夹 (新增部分)
    if (folder.children) {
        Object.entries(folder.children).forEach(([folderName, childFolder]) => {
            // 创建子文件夹容器
            const subFolderContainer = document.createElement('div');
            subFolderContainer.className = 'nested-folder-container';
            subFolderContainer.style.paddingLeft = (level * 15) + 'px';
            
            const subFolderHeader = document.createElement('div');
            subFolderHeader.className = 'nested-folder-item';
            
            const subFolderIcon = document.createElement('div');
            subFolderIcon.className = 'folder-icon';

            const iconSvg = createSvgElement(getFileIcon(folderName));
            subFolderIcon.appendChild(iconSvg);
            
            const subFolderName = document.createElement('span');
            subFolderName.textContent = folderName;
            
            subFolderHeader.appendChild(subFolderIcon);
            subFolderHeader.appendChild(subFolderName);
            
            subFolderContainer.appendChild(subFolderHeader);
            
            // 递归渲染子文件夹内容
            const subFolderContent = document.createElement('div');
            subFolderContent.className = 'nested-folder-content';
            subFolderContent.style.display = 'none'; // 默认隐藏
            
            renderFolderStructure(childFolder, subFolderContent, level + 1);
            
            // 添加点击事件用于展开/折叠子文件夹
            subFolderHeader.addEventListener('click', function(e) {
                e.stopPropagation();
                // 切换子文件夹内容的显示状态
                if (subFolderContent.style.display === 'none') {
                    subFolderContent.style.display = 'block';
                } else {
                    subFolderContent.style.display = 'none';
                }
            });
            
            subFolderContainer.appendChild(subFolderContent);
            container.appendChild(subFolderContainer);
        });
    }
}

