# Image Server
このサーバーコードは、`puk06/PicDrop`を使用した画像アップロードに使用できるサーバーを立てるためのコードです。

# 初回起動手順(Linuxでの手順)
1. インストールしたいフォルダに移動する
2. `sh -c "$(curl -fsSL https://raw.githubusercontent.com/puk06/Image-Server/refs/heads/main/Install.sh)"`
3. インストールが終わり、起動するまで待つ

Git、Node.js(stable)、pm2がダウンロードされ、pm2を使ってサーバーが自動で起動されます。

デフォルトのポートは8000ポートです

# 通常時の起動手順
1. `pm2 start ImageServer.js`で起動するだけです。

# ライセンス
ライブラリのライセンスは[THIRD_PARTY_LICENSES](https://github.com/puk06/Image-Server/blob/main/THIRD_PARTY_LICENSES)を御覧ください

サーバーコードのライセンスは[LICENSE](https://github.com/puk06/Image-Server/blob/main/LICENSE)を御覧ください
