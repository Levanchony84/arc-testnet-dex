import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function HPDeFiDashboard() {
  const [stats, setStats] = useState({
    platform: { pools: 3, users: 0, nfts: 0, volume: '0', fees: '0' },
    user: { name: '—', reputation: 0, trades: 0, volume: '0', verified: false, vip: false },
    daily: { volume: '0', trades: 0, fees: '0', nftSales: 0, arbitrage: 0 },
    staking: { stake: '0', rewards: '0', lockDays: 0, apr: 5.0, tvl: '0' },
    activity: []
  });

  const [volumeData, setVolumeData] = useState([]);
  const [activityData, setActivityData] = useState([
    { name: 'Swaps', value: 40, color: '#667eea' },
    { name: 'Liquidity', value: 25, color: '#764ba2' },
    { name: 'NFT', value: 20, color: '#f093fb' },
    { name: 'Other', value: 15, color: '#4facfe' }
  ]);

  useEffect(() => {
    // Simulate real-time data updates
    const interval = setInterval(() => {
      updateMockData();
    }, 5000);

    // Initial load
    updateMockData();
    generateVolumeData();

    return () => clearInterval(interval);
  }, []);

  const updateMockData = () => {
    setStats(prev => ({
      ...prev,
      platform: {
        ...prev.platform,
        users: prev.platform.users + Math.floor(Math.random() * 3),
        nfts: prev.platform.nfts + Math.floor(Math.random() * 2),
        volume: (parseFloat(prev.platform.volume) + Math.random() * 5).toFixed(2),
        fees: (parseFloat(prev.platform.fees) + Math.random() * 0.05).toFixed(4)
      },
      user: {
        name: 'გიორგი',
        reputation: prev.user.reputation + Math.floor(Math.random() * 5),
        trades: prev.user.trades + Math.floor(Math.random() * 2),
        volume: (parseFloat(prev.user.volume) + Math.random() * 2).toFixed(2),
        verified: prev.user.reputation > 200,
        vip: prev.user.reputation > 500
      },
      daily: {
        volume: (parseFloat(prev.daily.volume) + Math.random() * 3).toFixed(2),
        trades: prev.daily.trades + Math.floor(Math.random() * 3),
        fees: (parseFloat(prev.daily.fees) + Math.random() * 0.03).toFixed(4),
        nftSales: prev.daily.nftSales + (Math.random() > 0.7 ? 1 : 0),
        arbitrage: prev.daily.arbitrage + (Math.random() > 0.9 ? 1 : 0)
      }
    }));
  };

  const generateVolumeData = () => {
    const data = [];
    for (let i = 23; i >= 0; i--) {
      const hour = new Date().getHours() - i;
      data.push({
        time: `${hour >= 0 ? hour : 24 + hour}:00`,
        volume: Math.random() * 50 + 10,
        trades: Math.floor(Math.random() * 20 + 5)
      });
    }
    setVolumeData(data);
  };

  const StatCard = ({ icon, title, value, subtitle, highlight = false }) => (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-icon">{icon}</span>
        <h3>{title}</h3>
      </div>
      <div className={`stat-value ${highlight ? 'highlight' : ''}`}>{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );

  const ActivityItem = ({ time, action, details, type }) => (
    <div className="activity-item">
      <div className="activity-time">{time}</div>
      <div className="activity-content">
        <span className={`activity-badge badge-${type}`}>{action}</span>
        <span className="activity-details">{details}</span>
      </div>
    </div>
  );

  return (
    <div className="dashboard">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .dashboard {
          min-height: 100vh;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding: 20px;
          color: #333;
        }

        .header {
          text-align: center;
          color: white;
          padding: 40px 20px;
          margin-bottom: 30px;
        }

        .header h1 {
          font-size: 3em;
          margin-bottom: 10px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          animation: fadeInDown 0.8s ease;
        }

        .header p {
          font-size: 1.2em;
          opacity: 0.9;
        }

        .container {
          max-width: 1400px;
          margin: 0 auto;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }

        .stat-card {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          transition: all 0.3s ease;
          animation: fadeInUp 0.6s ease;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 40px rgba(0,0,0,0.3);
        }

        .stat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
        }

        .stat-icon {
          font-size: 2em;
        }

        .stat-header h3 {
          color: #667eea;
          font-size: 1.3em;
        }

        .stat-value {
          font-size: 2em;
          font-weight: bold;
          color: #333;
          margin: 10px 0;
        }

        .stat-value.highlight {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-subtitle {
          color: #666;
          font-size: 0.9em;
          margin-top: 5px;
        }

        .chart-container {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          margin-bottom: 30px;
          animation: fadeInUp 0.8s ease;
        }

        .chart-title {
          color: #667eea;
          font-size: 1.5em;
          margin-bottom: 20px;
          font-weight: bold;
        }

        .two-column {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 30px;
        }

        .activity-feed {
          background: white;
          border-radius: 15px;
          padding: 25px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          max-height: 600px;
          overflow-y: auto;
        }

        .activity-item {
          padding: 15px;
          margin-bottom: 10px;
          background: #f8f9fa;
          border-left: 4px solid #667eea;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .activity-item:hover {
          background: #e9ecef;
          transform: translateX(5px);
        }

        .activity-time {
          color: #999;
          font-size: 0.85em;
          margin-bottom: 5px;
        }

        .activity-content {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .activity-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 12px;
          font-size: 0.85em;
          font-weight: bold;
        }

        .badge-success {
          background: #d4edda;
          color: #155724;
        }

        .badge-primary {
          background: #cce5ff;
          color: #004085;
        }

        .badge-warning {
          background: #fff3cd;
          color: #856404;
        }

        .badge-info {
          background: #d1ecf1;
          color: #0c5460;
        }

        .activity-details {
          color: #555;
          font-size: 0.95em;
        }

        .controls {
          text-align: center;
          margin: 30px 0;
        }

        .btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 25px;
          font-size: 1em;
          cursor: pointer;
          margin: 0 10px;
          transition: all 0.3s ease;
          font-weight: 600;
        }

        .btn:hover {
          transform: scale(1.05);
          box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
        }

        .nft-gallery {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 15px;
          margin-top: 20px;
        }

        .nft-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 15px;
          padding: 20px;
          color: white;
          text-align: center;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .nft-card:hover {
          transform: scale(1.05) rotate(2deg);
        }

        .nft-icon {
          font-size: 3em;
          margin-bottom: 10px;
        }

        .nft-name {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .nft-rarity {
          font-size: 0.85em;
          opacity: 0.9;
        }

        .badge-container {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 10px;
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          .header h1 {
            font-size: 2em;
          }
          
          .two-column {
            grid-template-columns: 1fr;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="header">
        <h1>🚀 HP DeFi Empire</h1>
        <p>ანალიტიკის პანელი | Arc Testnet</p>
      </div>

      <div className="container">
        {/* Stats Grid */}
        <div className="stats-grid">
          <StatCard
            icon="💰"
            title="პლატფორმა"
            value={`${stats.platform.pools} პული`}
            subtitle={`${stats.platform.users} მომხმარებელი | ${stats.platform.nfts} NFT`}
            highlight
          />
          
          <StatCard
            icon="👤"
            title="პროფილი"
            value={stats.user.name}
            subtitle={
              <div className="badge-container">
                <span className={`activity-badge badge-${stats.user.vip ? 'warning' : 'info'}`}>
                  {stats.user.vip ? '⭐ VIP' : stats.user.verified ? '✓ Verified' : 'Regular'}
                </span>
                <span className="activity-badge badge-success">
                  {stats.user.reputation} REP
                </span>
              </div>
            }
          />
          
          <StatCard
            icon="📊"
            title="დღევანდელი მოცულობა"
            value={`${stats.daily.volume} ETH`}
            subtitle={`${stats.daily.trades} ტრანზაქცია`}
            highlight
          />
          
          <StatCard
            icon="🔒"
            title="TVL"
            value={`${stats.staking.tvl} ETH`}
            subtitle={`APR: ${stats.staking.apr}%`}
          />
        </div>

        {/* Charts Section */}
        <div className="two-column">
          <div className="chart-container">
            <div className="chart-title">📈 24-საათიანი მოცულობა</div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="time" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '2px solid #667eea',
                    borderRadius: '10px'
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#667eea" 
                  strokeWidth={3}
                  dot={{ fill: '#667eea', r: 4 }}
                  activeDot={{ r: 6 }}
                  name="მოცულობა (ETH)"
                />
                <Line 
                  type="monotone" 
                  dataKey="trades" 
                  stroke="#764ba2" 
                  strokeWidth={2}
                  name="ტრანზაქციები"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-container">
            <div className="chart-title">🎯 აქტივობა</div>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Feed & Stats */}
        <div className="two-column">
          <div className="activity-feed">
            <div className="chart-title">📝 ბოლო აქტივობები</div>
            <ActivityItem 
              time="2 წუთის წინ"
              action="NFT გაყიდვა"
              details="თბილისის ღამე #42 → 50 TCL"
              type="success"
            />
            <ActivityItem 
              time="5 წუთის წინ"
              action="Swap"
              details="25.5 TCL → 24.8 SAMSUNG"
              type="primary"
            />
            <ActivityItem 
              time="8 წუთის წინ"
              action="Liquidity"
              details="TCL/LG პულში +100 TCL"
              type="info"
            />
            <ActivityItem 
              time="12 წუთის წინ"
              action="Arbitrage"
              details="მოგება: 0.42 TCL"
              type="success"
            />
            <ActivityItem 
              time="15 წუთის წინ"
              action="Staking"
              details="50 SAMSUNG → 30 დღე lock"
              type="warning"
            />
            <ActivityItem 
              time="20 წუთის წინ"
              action="Proposal"
              details="ხმა: Fee შემცირება"
              type="info"
            />
            <ActivityItem 
              time="25 წუთის წინ"
              action="NFT Mint"
              details="კავკასიონის მთები [Epic]"
              type="success"
            />
          </div>

          <div className="chart-container">
            <div className="chart-title">📊 დეტალური სტატისტიკა</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '10px' }}>
                <div style={{ color: '#666', fontSize: '0.9em' }}>სულ ტრეიდები</div>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#667eea' }}>
                  {stats.user.trades}
                </div>
              </div>
              <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '10px' }}>
                <div style={{ color: '#666', fontSize: '0.9em' }}>მომხმარებლის მოცულობა</div>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#764ba2' }}>
                  {stats.user.volume} ETH
                </div>
              </div>
              <div style={{ padding: '15px', background: '#f8f9fa', borderRadius: '10px' }}>
                <div style={{ color: '#666', fontSize: '0.9em' }}>რეპუტაცია</div>
                <div style={{ fontSize: '1.8em', fontWeight: 'bold', color: '#f093fb' }}>
                  {stats.user.reputation} / 1000
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '10px', 
                  background: '#e0e0e0', 
                  borderRadius: '5px',
                  marginTop: '10px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${(stats.user.reputation / 1000) * 100}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* NFT Gallery */}
        <div className="chart-container">
          <div className="chart-title">🎨 NFT გალერეა</div>
          <div className="nft-gallery">
            <div className="nft-card">
              <div className="nft-icon">🌃</div>
              <div className="nft-name">თბილისის ღამე</div>
              <div className="nft-rarity">Epic</div>
            </div>
            <div className="nft-card">
              <div className="nft-icon">🏔️</div>
              <div className="nft-name">კავკასიონი</div>
              <div className="nft-rarity">Legendary</div>
            </div>
            <div className="nft-card">
              <div className="nft-icon">🍇</div>
              <div className="nft-name">ქართული ვაზი</div>
              <div className="nft-rarity">Rare</div>
            </div>
            <div className="nft-card">
              <div className="nft-icon">🏰</div>
              <div className="nft-name">სვანეთის კოშკი</div>
              <div className="nft-rarity">Epic</div>
            </div>
            <div className="nft-card">
              <div className="nft-icon">🌊</div>
              <div className="nft-name">ბათუმის ზღვა</div>
              <div className="nft-rarity">Common</div>
            </div>
            <div className="nft-card">
              <div className="nft-icon">⛪</div>
              <div className="nft-name">მცხეთის ტაძარი</div>
              <div className="nft-rarity">Mythic</div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="controls">
          <button className="btn" onClick={() => {
            updateMockData();
            generateVolumeData();
          }}>
            🔄 განახლება
          </button>
          <button className="btn" onClick={() => {
            const data = JSON.stringify(stats, null, 2);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `hp-stats-${Date.now()}.json`;
            a.click();
          }}>
            📥 Export
          </button>
          <button className="btn" onClick={() => {
            if (confirm('ნამდვილად გსურთ reset?')) {
              window.location.reload();
            }
          }}>
            🗑️ Reset
          </button>
        </div>
      </div>
    </div>
  );
}