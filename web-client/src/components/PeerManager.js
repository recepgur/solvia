import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { socket } from '../utils/config';

const PeerManager = ({ currentWallet }) => {
    const [peerAddress, setPeerAddress] = useState('');
    const [peers, setPeers] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        // Load saved peers from localStorage
        const savedPeers = localStorage.getItem(`peers_${currentWallet}`);
        if (savedPeers) {
            setPeers(JSON.parse(savedPeers));
        }

        // Listen for peer connection events
        const handlePeerConnected = (data) => {
            console.log('Peer connected:', data);
            if (data.address && !peers.includes(data.address)) {
                const updatedPeers = [...peers, data.address];
                setPeers(updatedPeers);
                localStorage.setItem(`peers_${currentWallet}`, JSON.stringify(updatedPeers));
            }
        };

        const handlePeerRequest = (data) => {
            if (data.requester && !peers.includes(data.requester)) {
                const updatedPeers = [...peers, data.requester];
                setPeers(updatedPeers);
                localStorage.setItem(`peers_${currentWallet}`, JSON.stringify(updatedPeers));
                // Notify the requester that we accepted
                socket.emit('peer_accepted', {
                    address: currentWallet,
                    acceptedPeer: data.requester
                });
            }
        };

        socket.on('peer_connected', handlePeerConnected);
        socket.on('peer_request', handlePeerRequest);

        return () => {
            socket.off('peer_connected', handlePeerConnected);
            socket.off('peer_request', handlePeerRequest);
        };
    }, [currentWallet, peers]);

    const addPeer = async () => {
        try {
            if (!peerAddress) {
                setError('Lütfen bir cüzdan adresi girin');
                return;
            }

            if (peerAddress === currentWallet) {
                setError('Kendi cüzdan adresinizi ekleyemezsiniz');
                return;
            }

            if (peers.includes(peerAddress)) {
                setError('Bu cüzdan adresi zaten ekli');
                return;
            }

            // Emit peer connection request
            socket.emit('add_peer', {
                address: peerAddress,
                requester: currentWallet
            });

            setPeerAddress('');
            setError('');

        } catch (error) {
            console.error('Peer ekleme hatası:', error);
            setError('Peer eklenirken bir hata oluştu');
        }
    };

    const removePeer = (address) => {
        const updatedPeers = peers.filter(peer => peer !== address);
        setPeers(updatedPeers);
        localStorage.setItem(`peers_${currentWallet}`, JSON.stringify(updatedPeers));
        
        // Notify the peer that they were removed
        socket.emit('peer_removed', {
            address: currentWallet,
            removedPeer: address
        });
    };

    return (
        <div className="space-y-4 p-4 bg-white rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Kişiler</h2>
            <div className="flex gap-2">
                <Input
                    type="text"
                    placeholder="Cüzdan adresi ekle"
                    value={peerAddress}
                    onChange={(e) => setPeerAddress(e.target.value)}
                    className="flex-1"
                />
                <Button onClick={addPeer}>Ekle</Button>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <div className="space-y-2">
                {peers.map((peer, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span className="text-sm">
                            {peer.slice(0, 6)}...{peer.slice(-4)}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removePeer(peer)}
                        >
                            Kaldır
                        </Button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PeerManager;
