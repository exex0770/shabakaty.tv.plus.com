const fs = require('fs');
const path = require('path');

const LOGO = 'https://i.imageupload.app/6a082ae964db7774dd08.png';

/*
==================================================
GROUPS
==================================================

IMPORTANT:
- IDs are kept unchanged so the app does not break.
- "order" controls display order only.
*/

const GROUPS = {
  '1': {
    nameEn: 'TOD BEIN SPORTS',
    nameAr: 'TOD BEIN SPORTS',
    file: 'TOD BEIN SPORTS.m3u',
    order: 1
  },

  '2': {
    nameEn: 'BEIN SPORTS MOOM',
    nameAr: 'BEIN SPORTS MOOM',
    file: 'BEIN SPORTS MOOM.m3u',
    order: 4
  },

  '3': {
    nameEn: 'ALWAN MOOM SPORT',
    nameAr: 'ALWAN MOOM SPORT',
    file: 'ALWAN MOOM SPORT.m3u',
    order: 3
  },

  '4': {
    nameEn: 'FADJR MOOM SPORT',
    nameAr: 'FADJR MOOM SPORT',
    file: 'FADJR MOOM SPORT.m3u',
    order: 5
  },

  '5': {
    nameEn: 'BEIN SPORTS',
    nameAr: 'BEIN SPORTS',
    file: 'BEIN SPORTS.m3u',
    order: 2
  },

  '6': {
    nameEn: 'ALKASS SPORTS',
    nameAr: 'ALKASS SPORTS',
    file: 'alkass.m3u',
    order: 6
  }
};


/*
==================================================
ATTRIBUTE PARSER
==================================================
*/

function getAttribute(line, attribute) {
  const regex = new RegExp(
    attribute + '="([^"]*)"',
    'i'
  );

  const match = line.match(regex);

  return match ? match[1].trim() : '';
}


/*
==================================================
NORMALIZE QUALITY
==================================================
*/

function normalizeQuality(value) {
  if (!value) return '';

  let q = String(value)
    .trim()
    .toUpperCase();

  q = q.replace(/\s+/g, '');

  if (
    q === 'LON' ||
    q === 'LONG' ||
    q === 'LOW'
  ) {
    return 'LON';
  }

  if (q === 'SD') {
    return 'SD';
  }

  if (q === 'HD') {
    return 'HD';
  }

  if (q === 'FHD') {
    return 'FHD';
  }

  if (q === 'UHD') {
    return 'UHD';
  }

  if (q === '4K') {
    return '4K';
  }

  if (q === '8K') {
    return '8K';
  }

  const pMatch = q.match(/(\d{3,4})P/);

  if (pMatch) {
    return `${pMatch[1]}P`;
  }

  const numberMatch = q.match(/^(\d{3,4})$/);

  if (numberMatch) {
    return `${numberMatch[1]}P`;
  }

  return q;
}


/*
==================================================
EXTRACT QUALITY
==================================================
*/

function extractQuality(extinfLine, channelName) {

  const tvgQuality = getAttribute(
    extinfLine,
    'tvg-quality'
  );

  if (tvgQuality) {
    return normalizeQuality(tvgQuality);
  }

  const tvgName = getAttribute(
    extinfLine,
    'tvg-name'
  );

  if (tvgName) {

    const match = tvgName.match(
      /(?:^|\s)(LON|LONG|LOW|SD|HD|FHD|UHD|4K|8K|\d{3,4}P)(?:\s|$)/i
    );

    if (match) {
      return normalizeQuality(match[1]);
    }
  }

  if (channelName) {

    const match = channelName.match(
      /(?:^|\s)(LON|LONG|LOW|SD|HD|FHD|UHD|4K|8K|\d{3,4}P)(?:\s|$)/i
    );

    if (match) {
      return normalizeQuality(match[1]);
    }
  }

  return '';
}


/*
==================================================
CLEAN CHANNEL NAME
==================================================
*/

function cleanChannelName(name) {

  if (!name) return '';

  let result = String(name).trim();

  result = result.replace(
    /\s+(?:LON|LONG|LOW|SD|HD|FHD|UHD|4K|8K|\d{3,4}P)\s*$/i,
    ''
  );

  return result.trim();
}


/*
==================================================
QUALITY PRIORITY
==================================================
*/

function qualityPriority(quality) {

  const q = normalizeQuality(quality);

  if (q === 'LON') return 1;

  if (q === '240P') return 2;
  if (q === '244P') return 2;

  if (q === '360P') return 3;

  if (q === '480P') return 4;

  if (q === '576P') return 5;

  if (q === '720P') return 6;

  if (q === '1080P') return 7;

  if (q === '1440P') return 8;

  if (q === '2160P') return 9;

  if (q === '4K') return 10;

  if (q === '8K') return 11;

  if (q === 'SD') return 20;

  if (q === 'HD') return 21;

  if (q === 'FHD') return 22;

  if (q === 'UHD') return 23;

  return 100;
}


/*
==================================================
SORT QUALITIES
==================================================
*/

function sortQualities(qualities) {

  return qualities.sort((a, b) => {

    const priorityA =
      qualityPriority(a.quality);

    const priorityB =
      qualityPriority(b.quality);

    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }

    return String(a.quality).localeCompare(
      String(b.quality)
    );
  });
}


/*
==================================================
GET GROUPS
==================================================
*/

function getGroups() {

  return Object.entries(GROUPS)

    // Display order only.
    // IDs remain unchanged.
    .sort(
      ([, a], [, b]) =>
        a.order - b.order
    )

    .map(([id, group]) => {

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


/*
==================================================
READ PLAYLIST
==================================================
*/

function readPlaylist(groupId) {

  const group = GROUPS[groupId];

  if (!group) {
    return [];
  }

  const filePath = path.join(
    process.cwd(),
    'channels',
    group.file
  );

  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(
    filePath,
    'utf8'
  );

  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  const channelsMap = new Map();

  let channelNumber = 0;

  for (let i = 0; i < lines.length; i++) {

    const line = lines[i];

    if (!line.startsWith('#EXTINF')) {
      continue;
    }

    const extinfLine = line;

    const streamUrl =
      lines[i + 1] || '';

    if (
      !streamUrl ||
      streamUrl.startsWith('#')
    ) {
      continue;
    }

    const tvgId =
      getAttribute(
        extinfLine,
        'tvg-id'
      );

    const tvgName =
      getAttribute(
        extinfLine,
        'tvg-name'
      );

    const groupTitle =
      getAttribute(
        extinfLine,
        'group-title'
      );

    /*
    ----------------------------------------------
    CHANNEL NAME
    ----------------------------------------------
    */

    let visibleName = '';

    const commaIndex =
      extinfLine.indexOf(',');

    if (commaIndex !== -1) {

      visibleName =
        extinfLine
          .substring(commaIndex + 1)
          .trim();
    }

    const originalName =
      tvgName ||
      visibleName ||
      `Channel ${channelNumber + 1}`;

    const cleanName =
      cleanChannelName(
        originalName
      );


    /*
    ----------------------------------------------
    CHANNEL ID
    ----------------------------------------------
    */

    const channelKey =
      tvgId ||
      cleanName.toLowerCase();


    /*
    ----------------------------------------------
    QUALITY
    ----------------------------------------------
    */

    const quality =
      extractQuality(
        extinfLine,
        originalName
      );


    /*
    ----------------------------------------------
    CREATE CHANNEL
    ----------------------------------------------
    */

    if (!channelsMap.has(channelKey)) {

      channelNumber++;

      channelsMap.set(
        channelKey,
        {
          id:
            `${groupId}_${channelNumber}`,

          id_sliders: null,

          id_custom_list: null,

          name_en:
            cleanName,

          name_ar:
            cleanName,

          id_groups:
            groupId,

          groups_name_en:
            group.nameEn,

          groups_name_ar:
            group.nameAr,

          groups_main_icon:
            LOGO,

          groups_sub_icon:
            LOGO,

          groups_logo:
            LOGO,

          groups_mobile_logo:
            LOGO,

          groups_link:
            '',

          logo:
            getAttribute(
              extinfLine,
              'tvg-logo'
            ) || LOGO,

          mobile_logo:
            getAttribute(
              extinfLine,
              'tvg-logo'
            ) || LOGO,

          real_channel_logo:
            getAttribute(
              extinfLine,
              'tvg-logo'
            ) || LOGO,

          logo_name:
            cleanName,

          link:
            '',

          link2:
            '',

          link3:
            '',

          qualities: [],

          group_title:
            groupTitle || group.nameEn,

          tvg_id:
            tvgId,

          quality_count:
            0,

          current_quality:
            '',

          stream_url:
            ''
        }
      );
    }


    /*
    ----------------------------------------------
    ADD QUALITY
    ----------------------------------------------
    */

    const channel =
      channelsMap.get(channelKey);

    const qualityName =
      quality || 'LON';


    /*
    Prevent duplicate quality entries
    */

    const alreadyExists =
      channel.qualities.some(
        item =>
          item.quality === qualityName &&
          item.url === streamUrl
      );


    if (!alreadyExists) {

      channel.qualities.push({
        quality: qualityName,
        url: streamUrl
      });
    }
  }


  /*
  ================================================
  FINALIZE CHANNELS
  ================================================
  */

  const channels =
    Array.from(
      channelsMap.values()
    );


  for (const channel of channels) {

    sortQualities(
      channel.qualities
    );


    /*
    ----------------------------------------------
    LINK / LINK2 / LINK3
    ----------------------------------------------
    */

    channel.link =
      channel.qualities[0]?.url || '';

    channel.link2 =
      channel.qualities[1]?.url || '';

    channel.link3 =
      channel.qualities[2]?.url || '';


    /*
    ----------------------------------------------
    QUALITY COUNT
    ----------------------------------------------
    */

    channel.quality_count =
      channel.qualities.length;


    /*
    ----------------------------------------------
    CURRENT QUALITY
    ----------------------------------------------
    */

    channel.current_quality =
      channel.qualities[0]?.quality || '';


    /*
    ----------------------------------------------
    STREAM URL
    ----------------------------------------------
    */

    channel.stream_url =
      channel.link;
  }


  return channels;
}


/*
==================================================
SUCCESS RESPONSE
==================================================
*/

function success(data) {

  return {
    api_status: 200,

    api_message: 'success',

    data: data
  };
}


/*
==================================================
MAIN API HANDLER
==================================================
*/

module.exports = async function handler(
  req,
  res
) {

  /*
  ----------------------------------------------
  HEADERS
  ----------------------------------------------
  */

  res.setHeader(
    'Access-Control-Allow-Origin',
    '*'
  );

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type'
  );

  res.setHeader(
    'Cache-Control',
    'no-store, no-cache, must-revalidate'
  );

  res.setHeader(
    'Content-Type',
    'application/json; charset=utf-8'
  );


  /*
  ----------------------------------------------
  OPTIONS
  ----------------------------------------------
  */

  if (req.method === 'OPTIONS') {

    return res.status(200).end();
  }


  /*
  ----------------------------------------------
  ONLY GET
  ----------------------------------------------
  */

  if (req.method !== 'GET') {

    return res.status(405).json({
      api_status: 405,
      api_message: 'Method Not Allowed',
      data: []
    });
  }


  try {

    const url =
      new URL(
        req.url,
        `http://${req.headers.host}`
      );


    const pathname =
      url.pathname;


    const groupParam =
      url.searchParams.get('group');


    const idGroupsParam =
      url.searchParams.get('id_groups');


    const channelParam =
      url.searchParams.get('id_channel');


    /*
    ==============================================
    /api?group=1
    /api?id_groups=1
    ==============================================
    */

    if (
      groupParam ||
      idGroupsParam
    ) {

      const groupId =
        groupParam ||
        idGroupsParam;

      return res.status(200).json(
        success(
          readPlaylist(groupId)
        )
      );
    }


    /*
    ==============================================
    /api
    ==============================================
    */

    if (
      pathname === '/api' ||
      pathname === '/'
    ) {

      return res.status(200).json(
        success(
          getGroups()
        )
      );
    }


    /*
    ==============================================
    /api/groups
    ==============================================
    */

    if (
      pathname === '/api/groups'
    ) {

      return res.status(200).json(
        success(
          getGroups()
        )
      );
    }


    /*
    ==============================================
    /api/channels?group=1
    ==============================================
    */

    if (
      pathname === '/api/channels'
    ) {

      const groupId =
        groupParam ||
        idGroupsParam;

      if (!groupId) {

        return res.status(200).json(
          success([])
        );
      }

      return res.status(200).json(
        success(
          readPlaylist(groupId)
        )
      );
    }


    /*
    ==============================================
    /api/channel?id_channel=1_1
    ==============================================
    */

    if (
      pathname === '/api/channel'
    ) {

      if (!channelParam) {

        return res.status(200).json(
          success([])
        );
      }

      const parts =
        channelParam.split('_');

      const groupId =
        parts[0];

      const channelId =
        channelParam;

      const channels =
        readPlaylist(groupId);

      const channel =
        channels.find(
          item =>
            item.id === channelId
        );

      return res.status(200).json(
        success(
          channel ? [channel] : []
        )
      );
    }


    /*
    ==============================================
    EMPTY ENDPOINTS
    ==============================================
    */

    if (
      pathname === '/api/sliders' ||
      pathname === '/api/slider_items' ||
      pathname === '/api/custom_list' ||
      pathname === '/api/custom_list_items' ||
      pathname === '/api/schedules'
    ) {

      return res.status(200).json(
        success([])
      );
    }


    /*
    ==============================================
    404
    ==============================================
    */

    return res.status(404).json({

      api_status: 404,

      api_message: 'Not Found',

      data: []
    });

  } catch (error) {

    console.error(
      'API Error:',
      error
    );

    return res.status(500).json({

      api_status: 500,

      api_message:
        error.message ||
        'Internal Server Error',

      data: []
    });
  }
};
