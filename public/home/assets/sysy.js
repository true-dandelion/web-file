document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const mainScreen = document.getElementById('main-screen');
    const uploadScreen = document.getElementById('upload-screen');
    const uploadBtn = document.getElementById('upload-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const uploadFileBtn = document.getElementById('upload-file-btn');
    const uploadFolderBtn = document.getElementById('upload-folder-btn');
    const fileInput = document.getElementById('file-input');
    const backBtn = document.querySelector('.back-btn');
    const closeBtn = document.querySelector('.close-btn');
    const clearListBtn = document.getElementById('clear-list-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const confirmBtn = document.getElementById('confirm-btn');
    const dropZone = document.querySelector('.upload-dropzone');
    const overlay = document.getElementById('overlay');
    const uploadArea = document.querySelector('.upload-area');
    const fileListContainer = document.getElementById('file-list-container');
    const currentPathElement = document.querySelector('.current-path');
    const newFolderBtn = document.getElementById('new-folder-btn');
    
    let selectedFiles = [];
    let uploadType = 'file'; // 默认上传类型：'file' 或 'folder'
    
    // 初始化文件获取模块
    window.fileAcquisition.initialize(fileListContainer, currentPathElement);
    
    // 主界面上传按钮点击事件
    uploadBtn.addEventListener('click', function() {
        uploadScreen.classList.add('active');
        overlay.style.display = 'block'; // 显示遮罩层
    });
    
    // 返回按钮点击事件
    backBtn.addEventListener('click', function() {
        uploadScreen.classList.remove('active');
        overlay.style.display = 'none'; // 隐藏遮罩层
        if (window.fileUploader && window.fileUploader.refreshFileList) {
            window.fileUploader.refreshFileList();
        }
    });
    
    // 关闭按钮点击事件
    closeBtn.addEventListener('click', function() {
        uploadScreen.classList.remove('active');
        overlay.style.display = 'none'; // 隐藏遮罩层
        if (window.fileUploader && window.fileUploader.refreshFileList) {
            window.fileUploader.refreshFileList();
        }
    });
    
    // 上传文件按钮点击事件
    uploadFileBtn.addEventListener('click', function() {
        uploadType = 'file';
        fileInput.setAttribute('webkitdirectory', '');
        fileInput.removeAttribute('webkitdirectory');
        fileInput.setAttribute('multiple', '');
        fileInput.click();
    });
    
    // 上传文件夹按钮点击事件
    uploadFolderBtn.addEventListener('click', function() {
        // 检测是否为移动设备
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            // 移动设备显示提示
            showModal('该功能暂时无法使用，上传文件夹请使用PC端');
            return;
        }
        
        // PC端正常执行上传文件夹功能
        uploadType = 'folder';
        fileInput.setAttribute('webkitdirectory', '');
        fileInput.setAttribute('multiple', '');
        fileInput.click();
    });
    
    // 清空列表按钮点击事件
    clearListBtn.addEventListener('click', function() {
        selectedFiles = [];
        updateFileList();
    });
    
    // 取消按钮点击事件
    cancelBtn.addEventListener('click', function() {
        uploadScreen.classList.remove('active');
        overlay.style.display = 'none'; // 隐藏遮罩层
        selectedFiles = [];
        if (window.fileUploader && window.fileUploader.refreshFileList) {
            window.fileUploader.refreshFileList();
        }
    });
    
    // 确认按钮点击事件
    confirmBtn.addEventListener('click', function() {
        if (selectedFiles.length > 0) {
            const currentPath = window.fileAcquisition.getCurrentPath();
            window.fileUploader.startUpload(selectedFiles, currentPath, uploadArea, selectedFiles);
        } else {
            showModal('请先选择要上传的文件');
        }
    });

    // 新建文件夹按钮点击事件
    if (newFolderBtn) {
        newFolderBtn.addEventListener('click', function() {
            showNewFolderModal();
        });
    }

    // 文件选择变化事件
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        
        if (uploadType === 'folder' && files.length > 0) {
            // 处理文件夹上传
            const folderStructure = buildFolderStructure(files);
            
            // 将每个顶级文件夹添加到选中文件列表
            Object.keys(folderStructure).forEach(folderName => {
                const folderFiles = getAllFilesInFolder(folderStructure[folderName]);
                
                selectedFiles.push({
                    type: 'folder',
                    name: folderName,
                    structure: folderStructure[folderName],
                    files: folderFiles,
                    size: folderFiles.reduce((total, file) => total + file.size, 0),
                    expanded: false // 默认折叠
                });
            });
        } else {
            // 处理文件上传
            files.forEach(file => {
                selectedFiles.push({
                    type: 'file',
                    name: file.name,
                    file: file,
                    size: file.size
                });
            });
        }
        
        updateFileList();
    });
    
    // 构建文件夹结构
    function buildFolderStructure(files) {
        const structure = {};
        
        files.forEach(file => {
            const pathParts = file.webkitRelativePath.split('/');
            const rootFolder = pathParts[0];
            
            if (!structure[rootFolder]) {
                structure[rootFolder] = {
                    type: 'folder',
                    name: rootFolder,
                    children: {},
                    files: []
                };
            }
            
            // 处理子文件夹和文件
            let currentLevel = structure[rootFolder];
            
            if (pathParts.length > 2) {
                // 有子文件夹
                for (let i = 1; i < pathParts.length - 1; i++) {
                    const folderName = pathParts[i];
                    
                    if (!currentLevel.children[folderName]) {
                        currentLevel.children[folderName] = {
                            type: 'folder',
                            name: folderName,
                            children: {},
                            files: []
                        };
                    }
                    
                    currentLevel = currentLevel.children[folderName];
                }
            }
            
            // 将文件添加到最后的文件夹中
            currentLevel.files.push(file);
        });
        
        return structure;
    }
    
    // 获取文件夹及其子文件夹中的所有文件
    function getAllFilesInFolder(folder) {
        let allFiles = [...folder.files];
        
        Object.values(folder.children).forEach(childFolder => {
            allFiles = allFiles.concat(getAllFilesInFolder(childFolder));
        });
        
        return allFiles;
    }
    
    // 拖拽相关事件 - 仅在非移动设备上添加
    const isMobile = window.innerWidth <= 767 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile && dropZone) {
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        // 添加高亮效果
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        // 移除高亮效果
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        // 处理文件拖放
        dropZone.addEventListener('drop', handleDrop, false);
    }
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    function highlight() {
        dropZone.style.borderColor = '#2196f3';
        dropZone.style.backgroundColor = '#f0f8ff';
    }
    
    function unhighlight() {
        dropZone.classList.remove('highlight');
        dropZone.style.border = '2px dashed #ccc';
        dropZone.style.backgroundColor = '#f9f9f9';
    }
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const items = dt.items;
        
        if (items) {
            // 使用 DataTransferItemList 接口处理拖拽项
            processItems(items);
        } else {
            // 回退到旧方法
            const files = Array.from(dt.files);
            files.forEach(file => {
                selectedFiles.push({
                    type: 'file',
                    name: file.name,
                    file: file,
                    size: file.size
                });
            });
            updateFileList();
        }
    }
    
    async function processItems(items) {
        const promises = [];
        const processedFiles = [];
        const processedFolders = new Map();
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            if (item.kind === 'file') {
                const entry = item.webkitGetAsEntry();
                
                if (entry) {
                    if (entry.isFile) {
                        promises.push(readFile(entry).then(file => {
                            processedFiles.push({
                                type: 'file',
                                name: file.name,
                                file: file,
                                size: file.size
                            });
                        }));
                    } else if (entry.isDirectory) {
                        promises.push(readDirectoryWithStructure(entry).then(result => {
                            processedFolders.set(result.name, {
                                type: 'folder',
                                name: result.name,
                                structure: result.structure,
                                files: result.allFiles.map(file => {
                                    // 确保文件有正确的webkitRelativePath属性
                                    if (!file.webkitRelativePath) {
                                        // 确保路径格式为"文件夹名/子路径/文件名"
                                        const fullPath = file._path || (result.name + '/' + file.name);
                                        Object.defineProperty(file, 'webkitRelativePath', {
                                            value: fullPath,
                                            writable: false
                                        });
                                    }
                                    return file;
                                }),
                                size: result.allFiles.reduce((total, file) => total + file.size, 0),
                                expanded: false
                            });
                        }));
                    }
                }
            }
        }
        
        await Promise.all(promises);
        
        // 添加处理的文件到选中文件列表
        processedFiles.forEach(file => selectedFiles.push(file));
        
        // 添加处理的文件夹到选中文件列表
        processedFolders.forEach(folder => selectedFiles.push(folder));
        
        updateFileList();
    }
    
    function readFile(fileEntry) {
        return new Promise((resolve, reject) => {
            fileEntry.file(file => resolve(file), reject);
        });
    }
    
    async function readDirectoryWithStructure(directoryEntry) {
        const structure = {
            type: 'folder',
            name: directoryEntry.name,
            children: {},
            files: []
        };
        
        const allFiles = [];
        
        async function processDirectory(entry, currentFolder, relativePath) {
            const reader = entry.createReader();
            
            // 递归读取目录内容
            const readEntries = () => {
                return new Promise((resolve, reject) => {
                    reader.readEntries(async entries => {
                        if (!entries.length) {
                            resolve();
                        } else {
                            for (const childEntry of entries) {
                                if (childEntry.isFile) {
                                    const file = await readFile(childEntry);
                                    // 添加相对路径信息 - 修复路径格式
                                    const filePath = relativePath ? 
                                        relativePath + '/' + childEntry.name : 
                                        entry.name + '/' + childEntry.name;
                                    
                                    // 保存完整路径到文件对象
                                    file._path = filePath;
                                    
                                    // 设置标准的webkitRelativePath属性
                                    if (!file.webkitRelativePath) {
                                        Object.defineProperty(file, 'webkitRelativePath', {
                                            value: filePath,
                                            writable: false
                                        });
                                    }
                                    
                                    currentFolder.files.push(file);
                                    allFiles.push(file);
                                } else if (childEntry.isDirectory) {
                                    const childFolder = {
                                        type: 'folder',
                                        name: childEntry.name,
                                        children: {},
                                        files: []
                                    };
                                    currentFolder.children[childEntry.name] = childFolder;
                                    
                                    // 构建正确的相对路径
                                    const newPath = relativePath ? 
                                        relativePath + '/' + childEntry.name : 
                                        entry.name + '/' + childEntry.name;
                                        
                                    await processDirectory(childEntry, childFolder, newPath);
                                }
                            }
                            // 继续读取下一批
                            await readEntries();
                            resolve();
                        }
                    }, reject);
                });
            };
            
            await readEntries();
        }
        
        await processDirectory(directoryEntry, structure, '');
        
        return {
            name: directoryEntry.name,
            structure: structure,
            allFiles: allFiles
        };
    }
    
    // 更新文件列表
    function updateFileList() {
        uploadArea.innerHTML = '';
        
        if (selectedFiles.length === 0) {
            const isMobile = window.innerWidth <= 767 || document.body.classList.contains('mobile-device');
            
            if (!isMobile) {
                // 在桌面端显示拖拽提示
                uploadArea.innerHTML = '<div class="empty-message">请选择文件，或拖拽文件到上方区域</div>';
            } else {
                // 在移动端只显示选择提示（没有拖拽）
                uploadArea.innerHTML = '<div class="empty-message">请点击"上传文件"按钮选择要上传的文件</div>';
            }
            return;
        }
        
        // 创建文件列表标题
        const fileListTitle = document.createElement('div');
        fileListTitle.className = 'file-list-title';
        fileListTitle.textContent = `已选择 ${selectedFiles.length} 个文件`;
        uploadArea.appendChild(fileListTitle);
        
        // 创建文件列表容器
        const fileList = document.createElement('div');
        fileList.className = 'file-list';
        
        // 添加文件或文件夹到列表
        selectedFiles.forEach((item, index) => {
            if (item.type === 'folder') {
                fileList.appendChild(createFolderItem(item, index));
            } else {
                fileList.appendChild(createFileItem(item, index));
            }
        });
        
        uploadArea.appendChild(fileList);
        
        // 更新选择按钮状态
        confirmBtn.disabled = selectedFiles.length === 0;
        confirmBtn.style.opacity = selectedFiles.length === 0 ? '0.7' : '1';
    }
    
    // 创建文件项
    function createFileItem(file, index) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        
        // 文件图标
        const fileIcon = document.createElement('span');
        fileIcon.className = 'file-icon';
        fileIcon.innerHTML = '';
        
        // 文件名称
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;
        
        // 文件大小
        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = window.fileAcquisition.formatFileSize(file.size);
        
        // 删除按钮
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'file-delete';
        deleteBtn.textContent = '×';
        deleteBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            selectedFiles.splice(index, 1);
            updateFileList();
        });
        
        fileItem.appendChild(fileIcon);
        fileItem.appendChild(fileName);
        fileItem.appendChild(fileSize);
        fileItem.appendChild(deleteBtn);
        
        return fileItem;
    }
    
    // 创建文件夹项
    function createFolderItem(folder, index) {
        const folderItem = document.createElement('div');
        folderItem.className = 'folder-container';
        folderItem.dataset.index = index;
        
        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-item';
        
        const expandIcon = document.createElement('div');
        expandIcon.className = 'expand-icon';
        expandIcon.innerHTML = '+';  // 初始状态为加号，表示可以展开
        
        const folderIcon = document.createElement('div');
        folderIcon.className = 'folder-icon';
        folderIcon.innerHTML = '';
        
        const folderName = document.createElement('div');
        folderName.className = 'folder-name';
        folderName.textContent = folder.name;
        
        const folderInfo = document.createElement('div');
        folderInfo.className = 'folder-info';
        folderInfo.textContent = `${folder.files.length} 个文件`;
        
        const folderDelete = document.createElement('div');
        folderDelete.className = 'folder-delete';
        folderDelete.innerHTML = '×';
        folderDelete.addEventListener('click', function(e) {
            e.stopPropagation();
            removeItem(index);
            updateFileList();
        });
        
        folderHeader.appendChild(expandIcon);
        folderHeader.appendChild(folderIcon);
        folderHeader.appendChild(folderName);
        folderHeader.appendChild(folderInfo);
        folderHeader.appendChild(folderDelete);
        
        // 创建文件夹内容容器，但初始状态为隐藏
        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content';
        folderContent.style.display = 'none';  // 初始状态为隐藏
        
        // 在此处渲染文件夹结构
        renderFolderStructure(folder, folderContent, 0);
        
        // 添加点击事件用于展开/折叠
        folderHeader.addEventListener('click', function() {
            // 切换文件夹内容的显示状态
            if (folderContent.style.display === 'none') {
                folderContent.style.display = 'block';
                expandIcon.innerHTML = '-';  // 更改为减号，表示可以折叠
            } else {
                folderContent.style.display = 'none';
                expandIcon.innerHTML = '+';  // 更改为加号，表示可以展开
            }
        });
        
        folderItem.appendChild(folderHeader);
        folderItem.appendChild(folderContent);
        
        return folderItem;
    }

    // 递归渲染文件夹结构
    function renderFolderStructure(folder, container, level) {
        // 清空容器，准备重新渲染
        // container.innerHTML = '';  // 移除这行，避免清空已有内容
        
        // 遍历文件夹中的文件
        folder.files.forEach(file => {
            if (file.isDirectory) {
                // 如果是子文件夹，递归处理
                const subFolderContainer = document.createElement('div');
                subFolderContainer.className = 'nested-folder-container';
                subFolderContainer.style.paddingLeft = (level * 15) + 'px';
                
                const subFolderHeader = document.createElement('div');
                subFolderHeader.className = 'nested-folder-item';
                
                const subFolderIcon = document.createElement('div');
                subFolderIcon.className = 'folder-icon';
                subFolderIcon.innerHTML = '';
                
                const subFolderName = document.createElement('span');
                subFolderName.textContent = file.name;
                
                subFolderHeader.appendChild(subFolderIcon);
                subFolderHeader.appendChild(subFolderName);
                
                subFolderContainer.appendChild(subFolderHeader);
                
                // 递归渲染子文件夹内容
                const subFolderContent = document.createElement('div');
                subFolderContent.className = 'nested-folder-content';
                subFolderContent.style.display = 'none'; // 默认隐藏
                
                renderFolderStructure(file, subFolderContent, level + 1);
                
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
            } else {
                // 如果是文件，直接添加
                const fileItem = document.createElement('div');
                fileItem.className = 'nested-file-item';
                fileItem.style.paddingLeft = (level * 15) + 'px';
                
                const fileIcon = document.createElement('div');
                fileIcon.className = 'file-icon';
                fileIcon.innerHTML = '';
                
                const fileName = document.createElement('span');
                fileName.textContent = file.name;
                
                fileItem.appendChild(fileIcon);
                fileItem.appendChild(fileName);
                
                container.appendChild(fileItem);
            }
        });
    }
    
    // 通用模态窗口管理 - 修复版
    const modalManager = {
        activeModal: null,
        modalBackgrounds: [], // 跟踪所有模态窗口背景
        
        // 关闭当前活动的模态窗口
        closeActiveModal: function() {
            if (this.activeModal && document.body.contains(this.activeModal)) {
                const modalContent = this.activeModal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.opacity = '0';
                    modalContent.style.transform = 'translateY(-20px)';
                } else {
                    this.activeModal.style.opacity = '0';
                    this.activeModal.style.transform = 'translate(-50%, -60%)';
                }
                
                setTimeout(() => {
                    // 确保节点仍然存在于文档中
                    if (document.body.contains(this.activeModal)) {
                        document.body.removeChild(this.activeModal);
                    }
                    // 从跟踪数组中移除
                    const index = this.modalBackgrounds.indexOf(this.activeModal);
                    if (index > -1) {
                        this.modalBackgrounds.splice(index, 1);
                    }
                    
                    document.body.style.overflow = ''; // 恢复页面滚动
                    this.activeModal = null;
                }, 300);
            }
        },
        
        // 关闭所有模态窗口
        closeAllModals: function() {
            // 复制数组，避免在遍历过程中修改原数组
            const modals = [...this.modalBackgrounds];
            modals.forEach(modal => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            });
            
            // 清空数组和激活的模态窗口
            this.modalBackgrounds = [];
            this.activeModal = null;
            document.body.style.overflow = ''; // 恢复页面滚动
        },
        
        // 创建模态窗口
        createModal: function(content, options = {}) {
            // 如果已经有活动的模态窗口，先关闭它
            if (this.activeModal) {
                this.closeActiveModal();
            }
            
            // 创建新的模态窗口
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0, 0, 0, 0.4)';
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.zIndex = '1001';
            
            // 将内容添加到模态窗口
            modal.appendChild(content);
            
            // 阻止冒泡，确保点击事件不会穿透到背景
            content.addEventListener('click', (e) => {
                e.stopPropagation();
            });
            
            // 添加点击背景关闭功能
            if (options.closeOnBackgroundClick !== false) {
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeActiveModal();
                    }
                });
            }
            
            // 添加到文档
            document.body.appendChild(modal);
            document.body.style.overflow = 'hidden'; // 防止滚动条
            
            // 记录当前活动的模态窗口
            this.activeModal = modal;
            this.modalBackgrounds.push(modal); // 添加到跟踪数组
            
            return modal;
        },
        
        // 创建简单消息模态窗口
        showMessage: function(message, buttonText = '确定') {
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.width = '350px';
            content.style.backgroundColor = '#fff';
            content.style.padding = '25px';
            content.style.borderRadius = '8px';
            content.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
            content.style.opacity = '0';
            content.style.transform = 'translateY(-20px)';
            content.style.transition = 'all 0.3s ease';
            content.style.textAlign = 'center';
            
            content.innerHTML = `
                <p style="margin-bottom: 20px; font-size: 16px; color: #333;">${message}</p>
                <button class="modal-button close-button" 
                       style="padding: 8px 16px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">${buttonText}</button>
            `;
            
            const modal = this.createModal(content);
            
            // 按钮点击事件
            const closeButton = content.querySelector('.close-button');
            closeButton.addEventListener('click', () => {
                this.closeActiveModal();
            });
            
            // 动画显示
            setTimeout(() => {
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            }, 50);
            
            return modal;
        },
        
        // 创建不可关闭的加载中模态窗口
        createLoadingModal: function(message, closeOnBackgroundClick = false) {
            const content = document.createElement('div');
            content.className = 'modal-content';
            content.style.width = '350px';
            content.style.backgroundColor = '#fff';
            content.style.padding = '25px';
            content.style.borderRadius = '8px';
            content.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
            content.style.opacity = '0';
            content.style.transform = 'translateY(-20px)';
            content.style.transition = 'all 0.3s ease';
            content.style.textAlign = 'center';
            
            content.innerHTML = `
                <div style="display: flex; justify-content: center; align-items: center; margin-bottom: 15px;">
                    <div class="loading-spinner" style="width: 24px; height: 24px; border: 3px solid #f3f3f3; 
                         border-top: 3px solid #4285f4; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <p style="margin: 0; font-size: 16px; color: #333;">${message}</p>
                <style>
                    @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                    }
                </style>
            `;
            
            const modal = this.createModal(content, { closeOnBackgroundClick: closeOnBackgroundClick });
            
            // 动画显示
            setTimeout(() => {
                content.style.opacity = '1';
                content.style.transform = 'translateY(0)';
            }, 50);
            
            return modal;
        }
    };

    // 将模态窗口管理器暴露为全局对象
    window.modalManager = modalManager;

    // 替换现有的showModal函数
    function showModal(message) {
        modalManager.showMessage(message);
    }

    // 新建文件夹模态窗口函数 - 修复版
    function showNewFolderModal() {
        const content = document.createElement('div');
        content.className = 'modal-content';
        content.style.width = '350px';
        content.style.backgroundColor = '#fff';
        content.style.padding = '25px';
        content.style.borderRadius = '8px';
        content.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        content.style.opacity = '0';
        content.style.transform = 'translateY(-20px)';
        content.style.transition = 'all 0.3s ease';
        
        content.innerHTML = `
            <h3 style="margin-top: 0; margin-bottom: 20px; color: #333; font-size: 18px;">新建文件夹</h3>
            <input type="text" id="new-folder-name" placeholder="请输入文件夹名称" 
                  style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; box-sizing: border-box;">
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button id="cancel-folder-btn" class="modal-button" 
                       style="padding: 8px 16px; background-color: #f5f5f5; color: #333; border: 1px solid #ddd; border-radius: 4px; cursor: pointer;">取消</button>
                <button id="create-folder-btn" class="modal-button" 
                       style="padding: 8px 16px; background-color: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">创建</button>
            </div>
        `;
        
        modalManager.createModal(content);
        
        // 动画显示
        setTimeout(() => {
            content.style.opacity = '1';
            content.style.transform = 'translateY(0)';
        }, 50);
        
        // 获取DOM元素
        const input = document.getElementById('new-folder-name');
        const cancelBtn = document.getElementById('cancel-folder-btn');
        const createBtn = document.getElementById('create-folder-btn');
        
        // 聚焦输入框
        if (input) {
            input.focus();
            input.value = '新建文件夹';
            // 选中文本内容，方便用户直接修改
            input.select();
        }
        
        // 取消按钮点击事件
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                modalManager.closeActiveModal();
            });
        }
        
        // 创建按钮点击事件
        if (createBtn) {
            createBtn.addEventListener('click', createFolder);
        }
        
        // 按Enter键也可以创建
        if (input) {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    createFolder();
                } else if (e.key === 'Escape') {
                    modalManager.closeActiveModal();
                }
            });
        }
        
        function createFolder() {
            if (!input) return;
            
            const folderName = input.value.trim();
            
            if (!folderName) {
                // 显示错误提示
                input.style.borderColor = '#f44336';
                input.style.backgroundColor = '#fff8f8';
                return;
            }
            
            // 获取当前路径
            const currentPath = window.fileAcquisition.getCurrentPath();
            
            // 发送创建文件夹的请求
            fetch('/create-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    path: currentPath,
                    folderName: folderName
                })
            })
            .then(response => {
                // 使用全局认证检查函数
                if (window.checkAuthStatus) {
                    window.checkAuthStatus(response);
                }
                return response.json();
            })
            .then(data => {
                // 使用全局认证检查函数
                if (window.checkAuthStatus) {
                    window.checkAuthStatus(data);
                }
                
                modalManager.closeActiveModal();
                
                if (data.success) {
                    // 创建成功，刷新文件列表
                    window.fileAcquisition.loadFilesFromServer(currentPath);
                } else {
                    // 创建失败，显示错误信息
                    setTimeout(() => {
                        modalManager.showMessage(data.message || '创建文件夹失败');
                    }, 300);
                }
            })
            .catch(error => {
                // 使用全局错误处理函数
                if (window.handleAuthError && window.handleAuthError(error)) {
                    return; // 认证错误已处理
                }
                
                modalManager.closeActiveModal();
                console.error('创建文件夹出错:', error);
                setTimeout(() => {
                    modalManager.showMessage('创建文件夹请求出错，请稍后再试');
                }, 300);
            });
        }
    }

    // 添加重置选中文件的全局函数
    window.resetSelectedFiles = function() {
        selectedFiles = [];
        updateFileList();
    };

    // 添加退出按钮点击事件
    logoutBtn.addEventListener('click', function() {
        // 创建一个 POST 请求到 /logout
        fetch('/logout', {
            method: 'POST',
            credentials: 'same-origin', // 包含 cookies
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                // 退出成功，重定向到登录页面
                window.location.href = '/login';
            } else {
                console.error('登出失败');
            }
        })
        .catch(error => {
            console.error('登出过程中发生错误:', error);
        });
    });

    // 在文件末尾添加这段代码，确保在桌面环境中拖放区域可见
    if (!(window.innerWidth <= 767 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent))) {
        const dropzoneContainer = document.querySelector('.upload-dropzone-container');
        if (dropzoneContainer) {
            dropzoneContainer.style.display = 'block';
        }
    }
    // 添加设置按钮点击事件
    const setupBtn = document.getElementById('upload-set-up');
    if (setupBtn) {
        setupBtn.style.cursor = 'pointer';
        
        setupBtn.addEventListener('click', function() {
            // 点击后跳转到 /set 页面
            window.location.href = '/setup';
        });
    }

    
});
