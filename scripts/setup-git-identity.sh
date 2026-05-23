#!/bin/bash
# 团队成员 Git 身份设置脚本
# 使用方法: bash scripts/setup-git-identity.sh <成员名>

MEMBER=$1

case $MEMBER in
  "小赫"|"xiaohe")
    git config user.name "小赫"
    git config user.email "xiaohe@izmw.me"
    ;;
  "饼哥"|"bingge")
    git config user.name "饼哥"
    git config user.email "bingge@izmw.me"
    ;;
  "像素姐"|"pixiel")
    git config user.name "像素姐"
    git config user.email "pixiel@izmw.me"
    ;;
  "码飞"|"mafei")
    git config user.name "码飞"
    git config user.email "mafei@izmw.me"
    ;;
  *)
    echo "未知成员: $MEMBER"
    echo "可选: 小赫/xiaohe, 饼哥/bingge, 像素姐/pixiel, 码飞/mafei"
    exit 1
    ;;
esac

echo "✅ Git 身份已设置为:"
echo "   姓名: $(git config user.name)"
echo "   邮箱: $(git config user.email)"
