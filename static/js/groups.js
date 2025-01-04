class GroupManager {
    constructor() {
        this.groups = new Map(); // groupId -> {name, members, admins, description, avatar, lastMessage}
        this.currentGroup = null;
        
        // Initialize UI elements
        this.newGroupBtn = document.getElementById('newGroupBtn');
        this.groupSettingsBtn = document.getElementById('groupSettingsBtn');
        
        if (this.newGroupBtn) {
            this.newGroupBtn.addEventListener('click', () => this.createNewGroup());
        }
        if (this.groupSettingsBtn) {
            this.groupSettingsBtn.addEventListener('click', () => this.showGroupSettings());
        }
    }
    
    showGroupSettings() {
        if (!this.currentGroup) return;
        
        const group = this.groups.get(this.currentGroup);
        if (!group) return;
        
        const walletAddress = localStorage.getItem('walletAddress');
        const isAdmin = group.admins.includes(walletAddress);
        
        const settingsHtml = `
            <div class="group-settings-dialog">
                <h3>${group.name}</h3>
                <div class="group-avatar">
                    ${group.avatar ? `<img src="${group.avatar}" alt="${group.name}">` : '<i class="fas fa-users"></i>'}
                    ${isAdmin ? '<button class="change-avatar-btn">Fotoğrafı Değiştir</button>' : ''}
                </div>
                <div class="group-description">
                    <h4>Grup Açıklaması</h4>
                    ${isAdmin ? 
                        `<textarea id="groupDescription">${group.description || ''}</textarea>
                         <button class="save-description-btn">Kaydet</button>` :
                        `<p>${group.description || 'Açıklama yok'}</p>`
                    }
                </div>
                <div class="group-members-list">
                    <h4>Grup Üyeleri (${group.members.length})</h4>
                    ${group.members.map(member => `
                        <div class="member-item">
                            <span>${member.slice(0, 8)}...</span>
                            ${group.admins.includes(member) ? '<span class="admin-badge">Admin</span>' : ''}
                            ${isAdmin && member !== walletAddress ? 
                                `<button class="remove-member-btn" data-address="${member}">
                                    <i class="fas fa-times"></i> Çıkar
                                </button>` : ''
                            }
                        </div>
                    `).join('')}
                </div>
                ${isAdmin ? `
                    <div class="group-admin-controls">
                        <button class="add-member-btn">Üye Ekle</button>
                        <button class="make-admin-btn">Admin Yap</button>
                    </div>
                ` : ''}
                <button class="close-settings-btn">Kapat</button>
            </div>
        `;
        
        const dialog = document.createElement('div');
        dialog.className = 'modal-overlay';
        dialog.innerHTML = settingsHtml;
        document.body.appendChild(dialog);
        
        // Event listeners for settings dialog
        dialog.querySelector('.close-settings-btn').addEventListener('click', () => {
            document.body.removeChild(dialog);
        });
        
        if (isAdmin) {
            dialog.querySelector('.add-member-btn').addEventListener('click', () => {
                this.addMemberToGroup(this.currentGroup);
            });
            
            dialog.querySelector('.change-avatar-btn').addEventListener('click', () => {
                this.changeGroupAvatar(this.currentGroup);
            });
            
            const saveDescBtn = dialog.querySelector('.save-description-btn');
            if (saveDescBtn) {
                saveDescBtn.addEventListener('click', () => {
                    const description = dialog.querySelector('#groupDescription').value;
                    this.updateGroupDescription(this.currentGroup, description);
                });
            }
            
            const removeBtns = dialog.querySelectorAll('.remove-member-btn');
            removeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const memberAddress = btn.getAttribute('data-address');
                    this.removeMemberFromGroup(this.currentGroup, memberAddress);
                });
            });
        }
    }
    
    async createNewGroup() {
        const groupName = prompt('Grup adını girin:');
        if (!groupName) return;
        
        const groupId = 'group_' + Date.now();
        const walletAddress = localStorage.getItem('walletAddress');
        
        const group = {
            id: groupId,
            name: groupName,
            members: [walletAddress],
            admins: [walletAddress],
            creator: walletAddress,
            description: '',
            avatar: null,
            created: Date.now()
        };
        
        try {
            // Store group metadata in IPFS
            const cid = await window.decentralizedStorage.storeMessage(group);
            
            // Broadcast group creation
            window.wsHandler.send({
                type: 'create_group',
                groupId: groupId,
                cid: cid
            });
            
            this.groups.set(groupId, group);
            this.addGroupToUI(group);
            
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Grup oluşturulurken bir hata oluştu.');
        }
    }
    
    addGroupToUI(group) {
        if (window.contactsManager) {
            const contactDiv = document.createElement('div');
            contactDiv.className = 'contact-item group';
            contactDiv.setAttribute('data-group-id', group.id);
            
            contactDiv.innerHTML = `
                <div class="contact-info">
                    <div class="contact-name">
                        <i class="fas fa-users"></i> ${group.name}
                    </div>
                    <div class="group-members">${group.members.length} üye</div>
                </div>
            `;
            
            contactDiv.addEventListener('click', () => {
                this.setActiveGroup(group.id);
                window.chatHandler.setCurrentChat(group.id, true);
            });
            
            const contactsList = document.getElementById('contactsList');
            if (contactsList) {
                contactsList.appendChild(contactDiv);
            }
        }
    }
    
    async addMemberToGroup(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;
        
        const walletAddress = localStorage.getItem('walletAddress');
        if (!group.admins.includes(walletAddress)) {
            alert('Sadece grup adminleri üye ekleyebilir.');
            return;
        }
        
        const memberAddress = prompt('Eklenecek üyenin cüzdan adresini girin:');
        if (!memberAddress || !memberAddress.trim()) return;
        
        if (group.members.includes(memberAddress)) {
            alert('Bu üye zaten grupta var.');
            return;
        }
        
        try {
            group.members.push(memberAddress);
            
            // Update group metadata in IPFS
            const cid = await window.decentralizedStorage.storeMessage(group);
            
            // Broadcast member addition
            window.wsHandler.send({
                type: 'update_group',
                groupId: groupId,
                cid: cid
            });
            
            this.updateGroupUI(group);
            
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Üye eklenirken bir hata oluştu.');
        }
    }
    
    updateGroupUI(group) {
        const groupDiv = document.querySelector(`[data-group-id="${group.id}"]`);
        if (groupDiv) {
            const membersDiv = groupDiv.querySelector('.group-members');
            if (membersDiv) {
                membersDiv.textContent = `${group.members.length} üye`;
            }
        }
    }
    
    setActiveGroup(groupId) {
        this.currentGroup = groupId;
        const contacts = document.querySelectorAll('.contact-item');
        contacts.forEach(contact => {
            contact.classList.remove('active');
            if (contact.getAttribute('data-group-id') === groupId) {
                contact.classList.add('active');
            }
        });
    }
    
    async handleGroupMessage(message) {
        try {
            const fullMessage = await window.decentralizedStorage.retrieveMessage(message.cid);
            if (fullMessage.type === 'group_message' && this.groups.has(fullMessage.groupId)) {
                const group = this.groups.get(fullMessage.groupId);
                const senderDisplay = `${fullMessage.sender.slice(0, 8)}... @ ${group.name}`;
                window.chatHandler.displayMessage(senderDisplay, fullMessage.content);
            }
        } catch (error) {
            console.error('Error handling group message:', error);
        }
    }

    async removeMemberFromGroup(groupId, memberAddress) {
        const group = this.groups.get(groupId);
        if (!group) return;

        const walletAddress = localStorage.getItem('walletAddress');
        if (!group.admins.includes(walletAddress)) {
            alert('Sadece grup adminleri üye çıkarabilir.');
            return;
        }

        if (memberAddress === group.creator) {
            alert('Grup kurucusu çıkarılamaz.');
            return;
        }

        try {
            const memberIndex = group.members.indexOf(memberAddress);
            if (memberIndex > -1) {
                group.members.splice(memberIndex, 1);
                
                // Also remove from admins if they were an admin
                const adminIndex = group.admins.indexOf(memberAddress);
                if (adminIndex > -1) {
                    group.admins.splice(adminIndex, 1);
                }

                // Update group metadata in IPFS
                const cid = await window.decentralizedStorage.storeMessage(group);
                
                // Broadcast member removal
                window.wsHandler.send({
                    type: 'update_group',
                    groupId: groupId,
                    cid: cid
                });

                this.updateGroupUI(group);
                
                // Close settings dialog and reopen to refresh
                const dialog = document.querySelector('.modal-overlay');
                if (dialog) {
                    document.body.removeChild(dialog);
                    this.showGroupSettings();
                }
            }
        } catch (error) {
            console.error('Error removing member:', error);
            alert('Üye çıkarılırken bir hata oluştu.');
        }
    }

    async makeAdmin(groupId, memberAddress) {
        const group = this.groups.get(groupId);
        if (!group) return;

        const walletAddress = localStorage.getItem('walletAddress');
        if (!group.admins.includes(walletAddress)) {
            alert('Sadece grup adminleri yeni admin atayabilir.');
            return;
        }

        if (!group.members.includes(memberAddress)) {
            alert('Bu üye grupta değil.');
            return;
        }

        if (group.admins.includes(memberAddress)) {
            alert('Bu üye zaten admin.');
            return;
        }

        try {
            group.admins.push(memberAddress);
            
            // Update group metadata in IPFS
            const cid = await window.decentralizedStorage.storeMessage(group);
            
            // Broadcast admin promotion
            window.wsHandler.send({
                type: 'update_group',
                groupId: groupId,
                cid: cid
            });

            // Refresh settings dialog
            const dialog = document.querySelector('.modal-overlay');
            if (dialog) {
                document.body.removeChild(dialog);
                this.showGroupSettings();
            }
        } catch (error) {
            console.error('Error making admin:', error);
            alert('Admin atanırken bir hata oluştu.');
        }
    }

    async changeGroupAvatar(groupId) {
        const group = this.groups.get(groupId);
        if (!group) return;

        const walletAddress = localStorage.getItem('walletAddress');
        if (!group.admins.includes(walletAddress)) {
            alert('Sadece grup adminleri grup fotoğrafını değiştirebilir.');
            return;
        }

        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            
            input.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    // Store image in IPFS
                    const imageBuffer = await file.arrayBuffer();
                    const imageCid = await window.decentralizedStorage.storeFile(
                        new Uint8Array(imageBuffer),
                        file.type
                    );

                    group.avatar = `ipfs://${imageCid}`;
                    
                    // Update group metadata in IPFS
                    const groupCid = await window.decentralizedStorage.storeMessage(group);
                    
                    // Broadcast avatar update
                    window.wsHandler.send({
                        type: 'update_group',
                        groupId: groupId,
                        cid: groupCid
                    });

                    // Refresh settings dialog
                    const dialog = document.querySelector('.modal-overlay');
                    if (dialog) {
                        document.body.removeChild(dialog);
                        this.showGroupSettings();
                    }
                } catch (error) {
                    console.error('Error uploading avatar:', error);
                    alert('Fotoğraf yüklenirken bir hata oluştu.');
                }
            };

            input.click();
        } catch (error) {
            console.error('Error changing avatar:', error);
            alert('Fotoğraf değiştirilirken bir hata oluştu.');
        }
    }

    async updateGroupDescription(groupId, description) {
        const group = this.groups.get(groupId);
        if (!group) return;

        const walletAddress = localStorage.getItem('walletAddress');
        if (!group.admins.includes(walletAddress)) {
            alert('Sadece grup adminleri açıklamayı değiştirebilir.');
            return;
        }

        try {
            group.description = description;
            
            // Update group metadata in IPFS
            const cid = await window.decentralizedStorage.storeMessage(group);
            
            // Broadcast description update
            window.wsHandler.send({
                type: 'update_group',
                groupId: groupId,
                cid: cid
            });

            alert('Grup açıklaması güncellendi.');
        } catch (error) {
            console.error('Error updating description:', error);
            alert('Açıklama güncellenirken bir hata oluştu.');
        }
    }
}

// Initialize group manager when document is ready
document.addEventListener('DOMContentLoaded', () => {
    window.groupManager = new GroupManager();
});

export default GroupManager;
