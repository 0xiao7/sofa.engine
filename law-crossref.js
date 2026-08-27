(function(root){
  'use strict';

  var LAW_TYPES = '(?:法|條例|規則|辦法|標準|準則|細則|規程|通則)';
  var ARTICLE_DIGITS = '[0-9０-９一二三四五六七八九十百千零兩两]+';
  var ARTICLE_NO = ARTICLE_DIGITS + '(?:\\s*(?:之|-)\\s*' + ARTICLE_DIGITS + ')?';
  var LAW_NAME = '[^，。、；：\\s《》〈〉()（）<>;；]{1,40}' + LAW_TYPES;

  function cleanLawName(raw){
    return String(raw || '')
      .replace(/^.*?(?:熟記本條與|熟記本條及|熟記本條|本條與|本條及)/, '')
      .replace(/^.*?(?:交叉記憶可看|可看|請看|請參照|請見|另參照|另見)/, '')
      .replace(/^(搭配|參照|依|按|見|與|及|並列)+/, '')
      .replace(/^[，。、；：\s]+|[，。、；：\s]+$/g, '')
      .trim();
  }

  function normalizeArticle(raw){
    var value = String(raw || '')
      .replace(/[０-９]/g, function(ch){ return String(ch.charCodeAt(0) - 0xFF10); })
      .replace(/^§\s*/, '')
      .split(/[｜|]/)[0]
      .replace(/\s+/g, '')
      .replace(/^第/, '')
      .replace(/條?之/g, '之')
      .replace(/-/g, '之')
      .replace(/條$/, '');
    return value.split('之').map(function(part){
      return /^\d+$/.test(part) ? String(Number(part)) : part;
    }).join('之');
  }

  function formatArticleLabel(raw){
    var article = normalizeArticle(raw);
    var parts = article.split('之');
    return '第' + parts[0] + '條' + (parts.length > 1 ? '之' + parts.slice(1).join('之') : '');
  }

  function formatLawCitation(law, article, includeLaw){
    return (includeLaw ? '《' + law + '》' : '') + formatArticleLabel(article);
  }

  function linkify(text, currentLawName, renderAnchor){
    var output = String(text || '');
    var lastLaw = cleanLawName(currentLawName);
    var anchors = [];
    function stash(law, art, label){
      var key = '@@SOFA_LAW_REF_' + anchors.length + '@@';
      anchors.push(renderAnchor(law, normalizeArticle(art), label));
      return key;
    }
    function prefixFor(rawLaw, law){
      var raw = String(rawLaw || '');
      return raw.endsWith(law) ? raw.slice(0, raw.length - law.length) : '';
    }

    var lawPattern = '(?:《([^》]+)》|〈([^〉]+)〉|(' + LAW_NAME + '))';
    var formalSubArticle = new RegExp('(?:《([^》]+)》|〈([^〉]+)〉|(同法|本法)|(' + LAW_NAME + '))?\\s*第?\\s*(' + ARTICLE_DIGITS + ')\\s*條\\s*之\\s*(' + ARTICLE_DIGITS + ')(?![0-9０-９一二三四五六七八九十百千零兩两項款目])', 'g');
    output = output.replace(formalSubArticle, function(match, bookLaw, angleLaw, sameLaw, plainLaw, baseArticle, subArticle){
      var rawLaw = bookLaw || angleLaw || plainLaw || '';
      var law = cleanLawName(rawLaw);
      var prefix = '';
      if(law){
        lastLaw = law;
        if(plainLaw) prefix = prefixFor(rawLaw, law);
      }else if(sameLaw){
        law = lastLaw || cleanLawName(currentLawName);
      }else{
        law = lastLaw || cleanLawName(currentLawName);
      }
      if(!law) return match;
      return prefix + stash(law, baseArticle + '之' + subArticle, formatLawCitation(law, baseArticle + '之' + subArticle, Boolean(rawLaw || sameLaw)));
    });

    var compactSeries = new RegExp(lawPattern + '\\s*第?\\s*(' + ARTICLE_NO + '(?:\\s*(?:、|,|，|及|和|與)\\s*第?\\s*' + ARTICLE_NO + ')+)\\s*條', 'g');
    output = output.replace(compactSeries, function(match, bookLaw, angleLaw, plainLaw, numbers){
      var rawLaw = bookLaw || angleLaw || plainLaw || '';
      var law = cleanLawName(rawLaw);
      if(!law) return match;
      lastLaw = law;
      var prefix = (bookLaw || angleLaw) ? '' : prefixFor(rawLaw, law);
      var first = true;
      var linked = String(numbers).split(/(、|,|，|及|和|與)/).map(function(token){
        if(/^(、|,|，|及|和|與)$/.test(token)) return token;
        var art = normalizeArticle(token);
        var label = formatLawCitation(law, art, first);
        first = false;
        return stash(law, art, label);
      }).join('');
      return prefix + linked;
    });

    var ordinary = new RegExp('(?:《([^》]+)》|〈([^〉]+)〉|(同法|本法)|(' + LAW_NAME + '))?\\s*第?\\s*(' + ARTICLE_NO + ')\\s*條', 'g');
    output = output.replace(ordinary, function(match, bookLaw, angleLaw, sameLaw, plainLaw, article){
      var rawLaw = bookLaw || angleLaw || plainLaw || '';
      var law = cleanLawName(rawLaw);
      var prefix = '';
      var includeLaw = false;
      if(law){
        lastLaw = law;
        includeLaw = true;
        if(plainLaw){
          prefix = prefixFor(rawLaw, law);
        }
      }else if(sameLaw){
        law = lastLaw || cleanLawName(currentLawName);
        includeLaw = true;
      }else{
        law = lastLaw || cleanLawName(currentLawName);
      }
      if(!law) return match;
      return prefix + stash(law, article, formatLawCitation(law, article, includeLaw));
    });

    return output.replace(/@@SOFA_LAW_REF_(\d+)@@/g, function(match, index){
      return anchors[Number(index)] || match;
    });
  }

  root.SoFaLawRefs = {
    cleanLawName: cleanLawName,
    normalizeArticle: normalizeArticle,
    formatArticleLabel: formatArticleLabel,
    formatLawCitation: formatLawCitation,
    linkify: linkify
  };
})(typeof window !== 'undefined' ? window : globalThis);
