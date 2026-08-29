const fs = require('fs');
const path = require('path');

const GROUPS = {
  '1': {
    nameEn: 'BEIN SPORTS',
    nameAr: 'BEIN SPORTS',
    file: 'bein_sports.m3u'
  },

  '2': {
    nameEn: 'BEIN SPORTS MOOM',
    nameAr: 'BEIN SPORTS MOOM',
    file: 'BEIN SPORTS MOOM.m3u'
  },

  '3': {
    nameEn: 'ALWAN SPORT MOOM',
    nameAr: 'ALWAN SPORT MOOM',
    file: 'alwan_sport.m3u'
  },

  '4': {
    nameEn: 'SOLO SPORT',
    nameAr: 'SOLO SPORT',
    file: 'SOLO SPORT.m3u'
  },

  '5': {
    nameEn: 'TOD BEIN SPORTS',
    nameAr: 'TOD BEIN SPORTS',
    file: 'TOD BEIN SPORTS.m3u'
  },

  '6': {
    nameEn: 'ALKASS SPORTS',
    nameAr: 'ALKASS SPORTS',
    file: 'alkass.m3u'
  }
};

/* =========================================
DEFAULT LOGO
========================================= */

const LOGO =
  'https://i.imageupload.app/6a082ae964db7774dd08.png';

/* =========================================
EXTRACT QUALITY
SUPPORTS NUMERIC + TEXT QUALITIES
========================================= */

function extractQuality(name) {

  if (!name) {
    return null;
  }

  /*
  ========================================
  NUMERIC QUALITIES
  ========================================
  240P, 360P, 480P, 576P, 720P, 900P, 1080P, 1440P, 2160P, 2880P, 4320P
  Also accepts: 1080, 2160
  */

  const numericMatch = name.match(/(?:^|\s)(\d{3,5})P?(?:\s|$)/i);

  if (numericMatch) {
    return (`${numericMatch[1]}P`).toUpperCase();
  }

  /*
  ========================================
  TEXT QUALITIES
  ========================================
  SD, HD, FHD, UHD, 4K, 8K, HDR, HDR10, HDR10+, DV, Dolby Vision
  */

  const textMatch = name.match(/(?:^|\s)(SD|HD|FHD|UHD|4K|8K|HDR|HDR10|HDR10\+|DV|DOLBY\s+VISION)(?:\s|$)/i);

  if (textMatch) {
    return (
      textMatch[1]
        .replace(/\s+/g, ' ')
        .toUpperCase()
    );
  }

  return null;
}

/* =========================================
REMOVE QUALITY FROM CHANNEL NAME
========================================= */

function cleanChannelName(name) {

  if (!name) {
    return '';
  }

  return name
    .replace(
      /\s+(?:\d{3,5}P?|SD|HD|FHD|UHD|4K|8K|HDR|HDR10|HDR10\+|DV|DOLBY\s+VISION)\s*$/i,
      ''
    )
    .trim();
}

/* =========================================
QUALITY NUMBER
========================================= */

function qualityNumber(quality) {

  if (!quality) {
    return 999999;
  }

  const q = quality.toUpperCase().trim();

  /*
  ========================================
  NUMERIC QUALITY
  ========================================
  */

  const numeric = q.match(/^(\d+)P$/);

  if (numeric) {
    return parseInt(numeric[1], 10);
  }

  /*
  ========================================
  TEXT QUALITY ORDER
  ========================================
  */

  const qualityMap = {
    'SD': 480,
    'HD': 720,
    'FHD': 1080,
    'UHD': 2160,
    '4K': 2160,
    '8K': 4320,
    'HDR': 2160,
    'HDR10': 2160,
    'HDR10+': 2160,
    'DV': 2160,
    'DOLBY VISION': 2160
  };

  return (qualityMap[q] || 999999);
}

/* =========================================
QUALITY SORT
========================================= */

function sortQualities(qualities) {

  return qualities.sort((a, b) => {
    const aNumber = qualityNumber(a.quality);
    const bNumber = qualityNumber(b.quality);

    /*  
     * إذا نفس الرقم  
     * نخلي الترتيب حسب الاسم  
     */
    if (aNumber === bNumber) {
      return a.quality.localeCompare(b.quality);
    }

    return (aNumber - bNumber);
  });
}

/* =========================================
READ M3U PLAYLIST
========================================= */

function readPlaylist(groupId) {

  const group = GROUPS[String(groupId)];

  if (!group) {
    return [];
  }

  const filePath = path.join(process.cwd(), 'channels', group.file);

  console.log('====================================');
  console.log('Reading group:', groupId);
  console.log('File:', group.file);
  console.log('Path:', filePath);
  console.log('====================================');

  /* =======================================
  CHECK FILE
  ======================================= */

  if (!fs.existsSync(filePath)) {
    console.error('M3U FILE NOT FOUND:', filePath);
    return [];
  }

  /* =======================================
  READ FILE
  ======================================= */

  let text;

  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error('READ FILE ERROR:', error);
    return [];
  }

  /* =======================================
  REMOVE BOM
  ======================================= */

  text = text.replace(/^\uFEFF/, '');

  /* =======================================
  SPLIT LINES
  ======================================= */

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  /* =======================================
  CHANNEL MAP
  ======================================= */

  const channelMap = new Map();

  /* =======================================
  READ CHANNELS
  ======================================= */

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    /* =====================================  
       ONLY EXTINF  
    ===================================== */
    if (!line.toUpperCase().startsWith('#EXTINF')) {
      continue;
    }

    const info = line;

    /* =====================================  
       CHANNEL NAME  
    ===================================== */
    const nameMatch = info.match(/,(.*)$/);
    let originalName = nameMatch ? nameMatch[1].trim() : `Channel ${channelMap.size + 1}`;

    if (!originalName) {
      originalName = `Channel ${channelMap.size + 1}`;
    }

    /* =====================================  
       EXTRACT QUALITY  
    ===================================== */
    const quality = extractQuality(originalName);
    const finalQuality = quality || 'AUTO';

    /* =====================================  
       CLEAN NAME  
    ===================================== */
    const channelName = cleanChannelName(originalName);

    /* =====================================  
       LOGO  
    ===================================== */
    const logoMatch = info.match(/tvg-logo\s*=\s*"([^"]*)"/i);
    const channelLogo = logoMatch && logoMatch[1] ? logoMatch[1].trim() : LOGO;

    /* =====================================  
       GROUP TITLE  
    ===================================== */
    const groupTitleMatch = info.match(/group-title\s*=\s*"([^"]*)"/i);
    const m3uGroupName = groupTitleMatch && groupTitleMatch[1] ? groupTitleMatch[1].trim() : group.nameEn;

    /* =====================================  
       TVG ID  
    ===================================== */
    const tvgIdMatch = info.match(/tvg-id\s*=\s*"([^"]*)"/i);
    const tvgId = tvgIdMatch && tvgIdMatch[1] ? tvgIdMatch[1].trim() : '';

    /* =====================================  
       STREAM URL  
    ===================================== */
    let link = '';
    if (lines[i + 1] && !lines[i + 1].startsWith('#')) {
      link = lines[i + 1].trim();
      i++;
    }

    /* =====================================  
       NO LINK  
    ===================================== */
    if (!link) {
      console.warn('Channel without stream:', originalName);
      continue;
    }

    /* =====================================  
       CHANNEL KEY  
    ===================================== */
    const mapKey = channelName.toLowerCase();

    /* =====================================  
       CREATE CHANNEL  
    ===================================== */
    if (!channelMap.has(mapKey)) {
      channelMap.set(mapKey, {
        name: channelName,
        logo: channelLogo,
        mobile_logo: channelLogo,
        real_channel_logo: channelLogo,
        logo_name: channelName,
        tvg_id: tvgId,
        group_title: m3uGroupName,
        qualities: []
      });
    }

    /* =====================================  
       GET CHANNEL  
    ===================================== */
    const channel = channelMap.get(mapKey);

    /* =====================================  
       CHECK DUPLICATE QUALITY  
    ===================================== */
    const existingQuality = channel.qualities.find(q => q.quality === finalQuality);

    /* =====================================  
       ADD QUALITY  
    ===================================== */
    if (!existingQuality) {
      channel.qualities.push({
        quality: finalQuality,
        link: link
      });
    }
  }

  /* =========================================
  CONVERT MAP TO ARRAY
  ========================================= */

  const channels = [];
  let channelNumber = 1;

  for (const channel of channelMap.values()) {

    /* =======================================  
       SORT QUALITIES  
    ======================================= */
    sortQualities(channel.qualities);

    /* =======================================  
       MAIN LINK  
    ======================================= */
    const mainQuality = channel.qualities[0];
    const link = mainQuality ? mainQuality.link : '';

    /* =======================================  
       LINK 2  
    ======================================= */
    const link2 = channel.qualities[1] ? channel.qualities[1].link : '';

    /* =======================================  
       LINK 3  
    ======================================= */
    const link3 = channel.qualities[2] ? channel.qualities[2].link : '';

    /* =======================================  
       CHANNEL ID  
    ======================================= */
    const channelId = `${groupId}_${channelNumber}`;

    /* =======================================  
       FINAL CHANNEL OBJECT  
    ======================================= */
    channels.push({
      id: channelId,
      id_sliders: null,
      id_custom_list: null,
      name_en: channel.name,
      name_ar: channel.name,
      id_groups: String(groupId),
      groups_name_en: group.nameEn,
      groups_name_ar: group.nameAr,
      groups_main_icon: LOGO,
      groups_sub_icon: LOGO,
      groups_logo: LOGO,
      groups_mobile_logo: LOGO,
      groups_link: '',
      logo: channel.logo,
      mobile_logo: channel.mobile_logo,
      real_channel_logo: channel.real_channel_logo,
      logo_name: channel.logo_name,
      link: link,
      link2: link2,
      link3: link3,
      qualities: channel.qualities,
      group_title: channel.group_title,
      tvg_id: channel.tvg_id,
      quality_count: channel.qualities.length
    });

    channelNumber++;
  }

  console.log(`Group ${groupId} loaded: ${channels.length} channels`);

  return channels;
}

/* =========================================
SUCCESS RESPONSE
========================================= */

function success(data) {
  return {
    api_status: 200,
    api_message: 'success',
    data: data
  };
}

/* =========================================
GET ALL GROUPS
========================================= */

function getGroups() {
  return Object.entries(GROUPS).map(([id, group]) => {
    return {
      id: id,
      name_en: group.nameEn,
      name_ar: group.nameAr,
      logo: LOGO,
      mobile_logo: LOGO,
      main_icon: LOGO,
      sub_icon: LOGO,
      link: '',
      Maintenance: '0'
    };
  });
}

/* =========================================
API
========================================= */

module.exports = (req, res) => {

  const url = new URL(req.url, 'https://localhost');
  const pathname = url.pathname.replace(/\/+$/, '') || '/';

  /* =======================================
  GROUP ID
  ======================================= */
  const groupId = url.searchParams.get('id_groups') || url.searchParams.get('group');

  /* =======================================
  CHANNEL ID
  ======================================= */
  const channelId = url.searchParams.get('id_channel');

  /* =======================================
  HEADERS
  ======================================= */
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  /* =======================================
  OPTIONS
  ======================================= */
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    /* =====================================  
       /api?group=1  (or 2, 3, 4, 5, 6)
    ===================================== */
    if (pathname === '/api' && groupId) {
      if (!GROUPS[String(groupId)]) {
        return res.status(400).json({
          api_status: 400,
          api_message: 'Invalid group',
          data: []
        });
      }

      const channels = readPlaylist(groupId);
      return res.status(200).json(success(channels));
    }

    /* =====================================  
       /api  (ALL GROUPS)
    ===================================== */
    if (pathname === '/api' && !groupId) {
      return res.status(200).json(success(getGroups()));
    }

    /* =====================================  
       /api/groups
    ===================================== */
    if (pathname === '/api/groups') {
      return res.status(200).json(success(getGroups()));
    }

    /* =====================================  
       /api/channels?group=1
    ===================================== */
    if (pathname === '/api/channels') {
      const id = groupId || '1';

      if (!GROUPS[String(id)]) {
        return res.status(400).json({
          api_status: 400,
          api_message: 'Invalid group',
          data: []
        });
      }

      const channels = readPlaylist(id);
      return res.status(200).json(success(channels));
    }

    /* =====================================  
       /api/channel?id_channel=2_1
    ===================================== */
    if (pathname === '/api/channel') {
      if (!channelId) {
        return res.status(200).json(success([]));
      }

      let channel = null;

      for (const id of Object.keys(GROUPS)) {
        const channels = readPlaylist(id);
        const found = channels.find(x => x.id === channelId);

        if (found) {
          channel = found;
          break;
        }
      }

      return res.status(200).json(success(channel ? [channel] : []));
    }

    /* =====================================  
       EMPTY ENDPOINTS
    ===================================== */
    if (
      pathname === '/api/sliders' ||
      pathname === '/api/slider_items' ||
      pathname === '/api/custom_list' ||
      pathname === '/api/custom_list_items' ||
      pathname === '/api/schedules'
    ) {
      return res.status(200).json(success([]));
    }

    /* =====================================  
       NOT FOUND
    ===================================== */
    return res.status(404).json({
      api_status: 404,
      api_message: 'Not found',
      data: []
    });

  } catch (error) {
    console.error('API ERROR:', error);
    return res.status(500).json({
      api_status: 500,
      api_message: 'Server error',
      data: []
    });
  }
};
