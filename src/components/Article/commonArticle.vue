<template>
    <my-scroller ref="scroller" class="create-article-scrollbar">
        <transition name="fade" v-if="isHidden">
            <div class="fixed-button-wrapper">
                <el-button
                    class="fixed-button"
                    type="primary"
                    size="medium"
                    @click="saveAsDemo"
                    round
                >
                    草 稿
                </el-button>
                <el-button
                    class="fixed-button"
                    type="success"
                    size="medium"
                    @click="publishArticle"
                    round
                >
                    发 布
                </el-button>
            </div>
        </transition>
        <div class="create-article-wrapper">
            <div class="button-wrapper"></div>
            <div class="title-wrapper">
                <span :class="{ 'title': true, 'toggle-blue': toggle }">标题:</span>
                <el-input
                    placeholder="请输入标题"
                    v-model="article.title"
                    @focus="handleFocus"
                    @blur="handleBlur"
                ></el-input>
            </div>
            <el-row type="flex" align="middle" class="author-publishtime-wrapper">
                <el-col :span="2" class="author-name">作者:</el-col>
                <el-col :span="8">
                    <template v-if="isAdmin">
                        <el-select
                            v-model="article.author"
                            placeholder="请选择"
                            v-if="candidates && candidates.length"
                        >
                            <el-option
                                v-for="(user, key) of candidates"
                                :key="key"
                                :label="user"
                                :value="user"
                            >
                            </el-option>
                        </el-select>
                    </template>
                    <template v-else>
                        <el-input
                            class="default-author"
                            placeholder="请输入内容"
                            v-model="article.author"
                            :disabled="true"
                        >
                        </el-input>
                    </template>
                </el-col>
                <el-col :span="2" class="publish-time">预发布时间:</el-col>
                <el-col :span="8">
                    <el-date-picker
                        v-model="article.publishDate"
                        align="right"
                        type="datetime"
                        placeholder="选择日期"
                        :picker-options="pickerOptions"
                        @change="handleChangeDate"
                        :disabled="!isAdmin && route.query._id"
                        format="yyyy-MM-dd HH:mm:ss"
                    >
                    </el-date-picker>
                </el-col>
            </el-row>
            <!-- 摘要 -->
            <slot name="abstract"></slot>
            <slot name="film"></slot>
            <tinymce-editor
                :height="editorHeight"
                ref="tinymce"
                @editor-inited="handleEditorInited"
            ></tinymce-editor>
            <slot name="music"></slot>
            <slot name="broadcast"></slot>
            <cover-cropper
                @success-upload="handleUploadCoverSuccess"
                :coverUrl="loadedCoverUrl"
            ></cover-cropper>
        </div>
    </my-scroller>
</template>

<script lang="ts">
import { Component, Vue, Prop, Watch } from 'vue-property-decorator';
import { getModule } from 'vuex-module-decorators';
import * as _ from 'lodash';
import { filterXSS } from 'xss';
import AdminModule from '@/store/modules/admin';
import ArticleModule from '@/store/modules/article';
import request from '@/utils/axios';
import TinymceEditor from '@/components/common/tinymce/index.vue';
import MyScroller from '@/components/common/scrollbar.vue';
import CoverCropper from '@/components/Article/common/coverCropper.vue';
import utils from '@/utils/utils';
import { SAVE_ARTICLE, SET_ARTICLE_ID } from '@/store/types';

@Component({
    components: {
        TinymceEditor,
        MyScroller,
        CoverCropper
    }
})
export default class ArticleCommon extends Vue {
    @Prop() type!: string;
    /* read specfic slot */
    @Prop({ default: '' }) abstract: string;
    @Prop({ default: () => ({ name: '', quote: '' }) }) film_info: { name: string; quote: string };
    @Prop({ default: () => ({ id: '', name: '', urls: '', artists: '', cover: '', album: '' }) })
    music_info: {
        id: number;
        name: string;
        urls: string;
        artists: string;
        cover: string;
        album: string;
    };
    @Prop({ default: '' }) broadcast: string;
    private admin!: AdminModule;
    private article_m!: ArticleModule;
    private article = {
        title: '',
        author: '',
        publishDate: '',
        content: '',
        cover: '',
        abstract: '',
        broadcast: '',
        film_info: {},
        music_info: {}
    };
    private candidates: string[] = [];
    private toggle = false;
    private editorHeight = 700;
    private isHidden = true;
    private scheduleTime = 100;
    private delay = 5000;
    private max = Date.now() - this.delay;
    private loadedCoverUrl = '';

    private pickerOptions = {
        disabledDate(time: Date) {
            return (
                time.getTime() < Date.now() - 1 ||
                time.getTime() > Date.now() + 3600 * 24 * 7 * 1000
            );
        },
        shortcuts: [
            {
                text: '今天',
                onClick(picker: any) {
                    picker.$emit('pick', new Date());
                }
            },
            {
                text: '明天',
                onClick(picker: any) {
                    const date = new Date();
                    date.setTime(date.getTime() + 3600 * 1000 * 24);
                    picker.$emit('pick', date);
                }
            },
            {
                text: '一周后',
                onClick(picker: any) {
                    const date = new Date();
                    date.setTime(date.getTime() + 3600 * 1000 * 24 * 7);
                    picker.$emit('pick', date);
                }
            }
        ]
    };

    get isAdmin() {
        return this.admin.userInfo.role === 'admin' ? true : false;
    }
    get content() {
        if (this.$refs['tinymce'] != null) {
            return (this as any).$refs['tinymce'].content;
        }
        return '';
    }
    @Watch('abstract')
    onAbstractChanged(val: string) {
        this.article.abstract = val;
    }
    @Watch('film_info', { deep: true, immediate: true })
    onFilmInfoChanged(val: any) {
        this.article.film_info = val;
    }
    @Watch('music_info', { deep: true, immediate: true })
    onMusicInfoChanged(val: any) {
        this.article.music_info = val;
    }
    @Watch('broadcast', { deep: true, immediate: true })
    onBroadcastChanged(val: any) {
        this.article.broadcast = val;
    }
    public async created() {
        this.admin = getModule(AdminModule, this.$store);
        this.article_m = getModule(ArticleModule, this.$store);
        this.article_m[SET_ARTICLE_ID]('');
        // 文章编辑逻辑
        if (this.$route && this.$route.query && this.$route.query._id && this.$route.query.type) {
            try {
                const { _id, type } = this.$route.query;
                const { _id: author_id } = this.admin;
                const { code, message, info } = await request.getArticleInfo(
                    _id as string,
                    author_id,
                    type as string
                );
                if (code === 0) {
                    const {
                        title,
                        author,
                        publish_time: publishDate,
                        cover_img: cover,
                        content
                    } = info;
                    this.article = Object.assign(this.article, {
                        title,
                        author,
                        publishDate,
                        cover,
                        content
                    });
                    // emit修改父组件变量
                    this.emitSlotInfoByType(info);
                    // prop子组件img
                    this.loadedCoverUrl = this.article.cover;
                    this.article_m[SET_ARTICLE_ID](this.$route.query._id as string);
                } else {
                    throw Error(message);
                }
            } catch (error) {
                this.$message.error(error.message);
            }
        }
    }
    public async mounted() {
        if (this.isAdmin) {
            const data = await request.getAllUsername();
            if (data.code === 0) {
                this.candidates = data.info.user;
                // fix 编辑时作者显示错误bug
                if (this.article.author === '') {
                    this.article.author = this.candidates[0];
                }
            }
        } else {
            this.article.author = this.admin.userInfo.username;
        }
        this.$nextTick(() => {
            const self = this;
            ((this as any).$refs['scroller'].$el as HTMLElement)
                .getElementsByClassName('el-scrollbar__wrap')[0]
                .addEventListener(
                    'scroll',
                    _.throttle(self.checkToHide.bind(self), this.scheduleTime)
                );
            this.$notify.info({
                title: '提示',
                message: '记得定期保存草稿哦',
                duration: 2000
            });
        });
    }
    private handleChangeDate() {
        this.$message.info('实际发布时间可能受审核影响, 对此产生的不便深感抱歉...');
    }
    private checkToHide() {
        const bottom = ((this as any).$refs['tinymce'].$el as HTMLElement).getClientRects()[0]
            .bottom;
        if (bottom >= 165 + this.editorHeight) {
            this.isHidden = true;
        } else {
            this.isHidden = false;
        }
    }
    public handleFocus() {
        this.toggle = true;
    }
    public handleBlur() {
        this.toggle = false;
    }
    public handleUploadCoverSuccess(cover: string) {
        this.article.cover = cover;
    }
    /**节流**/
    private async throttle(resolve: Function) {
        if (Date.now() - this.max > this.delay) {
            this.max = Date.now();
            await resolve.apply(this);
        } else {
            this.$message(
                this.$rules.message(`操作过于频繁,请${this.delay / 1000}秒后重试`, 'error')
            );
        }
    }
    public async saveAsDemo() {
        this.throttle(async function() {
            if (this.validateOptions(0)) {
                this.article.content = this.content;
                this.formatArticleExceptXSS(this.article);
                try {
                    // 保存并将id写入vuex
                    const { code, message } = await this.article_m[SAVE_ARTICLE]({
                        article: this.article,
                        type: this.type,
                        isDemo: true,
                        _id: this.article_m.articleId
                    });
                    if (code === 0) {
                        this.$message(this.$rules.message(message));
                    } else {
                        this.$message(this.$rules.message(message, 'error'));
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });
    }
    public publishArticle() {
        this.throttle(async function() {
            if (this.validateOptions(1) && this.switchByType()) {
                this.article.content = this.content;
                this.formatArticleExceptXSS(this.article);
                try {
                    // 保存并将id写入vuex
                    const { code, message } = await this.article_m[SAVE_ARTICLE]({
                        article: this.article,
                        type: this.type,
                        isDemo: false,
                        _id: this.article_m.articleId
                    });
                    if (code === 0) {
                        this.$message(this.$rules.message(message));
                        setTimeout(() => {
                            this.$router.push({
                                path: `${this.$route.path.slice(0, -6)}/list`
                            });
                        }, 1000);
                    } else {
                        this.$message(this.$rules.message(message, 'error'));
                    }
                } catch (error) {
                    console.log(error);
                }
            }
        });
    }
    private validateOptions(status: number) {
        const { title, publishDate, cover } = this.article;
        if (status === 0) {
            // 草稿
            if (title === '') {
                this.$message.error('请至少填写标题!');
                return false;
            }
        } else {
            // 发布
            if (title === '' || publishDate === '' || cover === '' || this.content === '') {
                this.$message.error('有未填写内容');
                return false;
            }
        }
        return true;
    }
    private switchByType() {
        switch (this.type) {
            case 'read': {
                if (this.abstract === '') {
                    this.$message.error('请填写摘要');
                    return false;
                }
                break;
            }
            case 'film': {
                if (!this.film_info.name || !this.film_info.quote) {
                    this.$message.error('请填写电影信息');
                    return false;
                }
                break;
            }
            case 'music': {
                if (!this.music_info.urls || !this.music_info.cover) {
                    this.$message.error('请选择音乐');
                    return false;
                }
                break;
            }
            case 'broadcast': {
                if (this.broadcast === '') {
                    this.$message.error('请上传自定义音频');
                    return false;
                }
                break;
            }
        }
        return true;
    }
    private formatArticleExceptXSS(obj: any | string) {
        if (utils.isPlainObject(obj)) {
            for (const key in obj) {
                if (typeof obj[key] === 'string') {
                    obj[key] = filterXSS(obj[key]);
                } else {
                    this.formatArticleExceptXSS(obj[key]);
                }
            }
        }
    }
    public emitSlotInfoByType(info: any) {
        switch (this.type) {
            case 'read': {
                this.$emit('loadAbstract', info.abstract);
                break;
            }
            case 'music': {
                this.$emit('loadMusicInfo', info.music_info);
                break;
            }
            case 'film': {
                this.$emit('loadFilmInfo', info.film_info);
                break;
            }
            case 'broadcast': {
                this.$emit('loadBroadcast', info.broadcast);
            }
        }
    }
    public handleEditorInited() {
        this.$nextTick(() => {
            console.log('emit');
            // content写入tinymce
            if (
                this.$route &&
                this.$route.query &&
                this.$route.query._id &&
                this.$route.query.type
            ) {
                setTimeout(() => {
                    (this.$refs['tinymce'] as any).content = this.article.content;
                }, 500);
            }
        });
    }
}
</script>
<style lang="scss" scoped>
@import '~@/assets/css/default.scss';

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}
.fade-enter,
.fade-leave-to {
    opacity: 0;
}

.create-article-scrollbar {
    position: relative;
    .create-article-wrapper {
        margin: 150px auto 50px;
        width: 90%;
        box-sizing: border-box;
        color: $gray;
        font-weight: bold;
        .title-wrapper {
            width: 80%;
            .title {
                display: block;
                padding: 10px;
                transition: color 0.2s linear;
            }
            ::v-deep .el-input__inner {
                border-top: 0;
                border-left: 0;
                border-right: 0;
                border-radius: 0;
            }
        }
        .author-publishtime-wrapper {
            margin: 40px 0 40px;
            padding-left: 10px;
            .default-author {
                width: 220px;
            }
        }
        .toggle-blue {
            color: $blue !important;
        }
    }
    .fixed-button-wrapper {
        position: absolute;
        z-index: 999;
        top: calc(150px / 2 - 36px / 2);
        right: 80px;
        .fixed-button {
            margin-right: 10px;
        }
    }
}
</style>
