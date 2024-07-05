import React, { useCallback, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { AxiosError, isAxiosError } from 'axios';
import UserProfile from '@/components/Profiles/UserProfile';
import CommonButton from '@/components/common/CommonButton';
import QuizModalTemplete from '@/components/Profiles/QuizModalTemplete';
import useBoolean from '@/hooks/useBoolean';
import Modal from '@/components/common/Modal';
import { WIKI_BASE_URL } from '@/constants/url';
import { StyledToastContainer } from '@/styles/ToastStyle';
import 'react-toastify/dist/ReactToastify.css';
import { Editor, EditorMarkdown } from '@/components/Profiles/Editor';
import { EDITOR_TEXT } from '@/constants/editorBasicText';
import BasicWikiSection from '@/components/Profiles/BasicWikiSection';
import {
  DetailProfileResponse,
  CodeType,
  ChangeProfilesFormData,
  PingFormData,
} from '@/types/apiType';
import { createPing, getDetailProfiles, updateProfile } from '@/lib/apis/profile/profileApi.api';
import getImageUrl, { ImageData } from '@/lib/apis/image/imageApi.api';
import { FORM_DATA_INIT } from '@/constants/formDataInitialValue';
import Loading from '@/components/Loading';
import ToastSelect from '@/components/common/ToastSelect';
import useIsMobile from '@/hooks/useIsMobile';
import { useAuthStore } from '@/store/userAuthStore';
import { useStore } from '@/store/useStore';
import throttle from '@/utils/throttle';
import MetaTag from '@/components/common/MetaTag';

const noContentClassName = `text-lg-regular text-grayscale-400`;

const UserWikiPage: React.FC = () => {
  const router = useRouter();
  const { code } = router.query;
  const URL = `${WIKI_BASE_URL}${code}`;
  const user = useStore(useAuthStore, (state) => {
    return state.user;
  });

  const [isEditing, setIsEditing] = useState(false);

  const { value, handleOff, handleOn } = useBoolean();
  const [userProfile, setUserProfile] = useState<DetailProfileResponse | undefined>(undefined);

  const isMyPage = code === user?.profile?.code;
  const editMyPage = isEditing && isMyPage;

  const [formData, setFormData] = useState<ChangeProfilesFormData>(FORM_DATA_INIT);

  const [md, setMD] = useState<string | undefined>(undefined);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [renewalTime, setRenewalTime] = useState<boolean>(false);

  const contentClassName = `
  w-full xl:absolute
  md:mt-5 xl:right-[440px] xl:w-[856px]
  ${userProfile && userProfile.content ? 'xl:top-[150px]' : 'xl:top-[150px]'}
  ${isEditing ? 'xl:top-[1px]' : ''}
  ${userProfile && userProfile.content && isEditing ? 'xl:top-[40px]' : ''}
`.trim();

  const isMobile = useIsMobile();

  const handleChange = useCallback((id: string, value?: string | File | null) => {
    setFormData((prev) => {
      return {
        ...prev,
        [id]: value,
      };
    });
  }, []);

  const getUserProfile = async (query: CodeType) => {
    try {
      const res = await getDetailProfiles(query);
      setUserProfile(res);
      setEditorInitialValue(res.content);
    } catch (error) {
      if (error instanceof AxiosError) {
        if (error.status === 404) {
          router.push('/404');
        } else {
          router.push('/500');
        }
      }
    }
  };

  const updateEditTime = async () => {
    setRenewalTime((prev) => {
      return !prev;
    });
    if (answer) {
      const pingFormData = new FormData();
      pingFormData.append('securityAnswer', answer);
      await createPing(code, pingFormData as unknown as PingFormData);
    }
  };

  const setAnswerValue = (value: string) => {
    setAnswer(value);
  };

  const setEditorInitialValue = useCallback((value: string | null) => {
    setMD(value ? value : EDITOR_TEXT);
  }, []);

  const handleWikiButtonClick = () => {
    handleOn();
  };

  const throttlePing = throttle(updateEditTime, 6 * 10000);

  const handleEditorChange = useCallback((value: string | undefined) => {
    setMD(value);
    throttlePing();
    handleChange('content', value);
    if (!value) {
      handleChange('content', null);
    }
  }, []);

  const setEditingMode = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
  };

  const handleSaveClick = async () => {
    try {
      let updatedFormData = { ...formData };

      if (formData.image instanceof File) {
        const imageData = new FormData();
        imageData.append('image', formData.image);

        const res = await getImageUrl(imageData as ImageData);
        if (res?.url) {
          updatedFormData = {
            ...formData,
            image: res.url,
          };
          setFormData(updatedFormData);
        }
      }

      const profileUpdateResponse = await updateProfile(
        userProfile?.code,
        updatedFormData as ChangeProfilesFormData,
      );

      setUserProfile(profileUpdateResponse);
      setIsEditing(false);
    } catch (error: unknown) {
      if (isAxiosError(error)) {
        ToastSelect({ type: 'error', message: error?.response?.data.message });
      } else {
        ToastSelect({ type: 'error', message: '예상치 못한 에러가 발생했습니다.' });
      }
    }
  };

  useEffect(() => {
    if (userProfile) {
      const {
        nationality,
        family,
        bloodType,
        nickname,
        birthday,
        sns,
        job,
        mbti,
        city,
        image,
        content,
      } = userProfile;

      // Create the new object with only the necessary keys
      const newFormData: ChangeProfilesFormData = {
        nationality,
        family,
        bloodType,
        nickname,
        birthday,
        sns,
        job,
        mbti,
        city,
        image,
        content,
      };

      setFormData(newFormData);
    }
  }, [userProfile]);

  useEffect(() => {
    if (code) {
      getUserProfile(code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    if (isEditing || renewalTime) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(
        () => {
          setIsEditing(false);
          ToastSelect({
            type: 'notification',
            message: '수정 가능 시간 5분을 초과하였습니다.',
          });
        },
        5 * 6 * 10000,
      );
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }
  }, [renewalTime]);

  if (!userProfile) {
    return <Loading />;
  }

  return (
    <>
      <MetaTag
        title={`${userProfile.name} 위키`}
        description={`${userProfile.name}님 위키 페이지`}
        url={`wiki/${userProfile.code}`}
        {...(userProfile.image && { image: userProfile.image })}
      />
      <div className="center m-auto max-w-[1350px] flex-col px-6 py-5 sm:flex-col sm:pt-10 md:px-14 xl:relative xl:py-5">
        <StyledToastContainer limit={1} />
        {isEditing || (
          <BasicWikiSection
            name={userProfile.name}
            content={userProfile.content}
            onClick={handleOn}
            url={URL}
          />
        )}

        <UserProfile
          {...userProfile}
          isEditing={isEditing}
          isMyPage={isMyPage}
          editMyPage={editMyPage}
          onChange={handleChange}
          value={formData.image}
        />

        <div className={contentClassName}>
          {!userProfile.content && !isEditing && (
            <div className="flex h-[184px] w-full flex-col items-center justify-center rounded-10 bg-grayscale-100 md:mt-5 md:h-[192px] ">
              <p className={noContentClassName}>아직 작성된 내용이 없네요.</p>
              <p className={noContentClassName}>위키에 참여해보세요!</p>
              <CommonButton variant="primary" className="mt-4" onClick={handleWikiButtonClick}>
                시작하기
              </CommonButton>
            </div>
          )}
          {isEditing ? (
            <Editor
              preview="live"
              value={md}
              onChange={handleEditorChange}
              height={740}
              hideToolbar={isMobile && true}
              autoFocus={true}
            />
          ) : (
            <EditorMarkdown source={userProfile.content} />
          )}
        </div>

        {isEditing && (
          <div className="ml-auto flex gap-3 sm:absolute sm:right-[60px] sm:top-[75px] md:absolute md:right-[90px] md:top-[75px] lg:top-[95px] xl:static xl:mt-[30px]">
            <CommonButton variant="secondary" onClick={handleCancelClick} className="bg-white">
              취소
            </CommonButton>
            <CommonButton variant="primary" onClick={handleSaveClick}>
              저장
            </CommonButton>
          </div>
        )}

        <Modal isOpen={value} onClose={handleOff}>
          <QuizModalTemplete
            question={userProfile.securityQuestion}
            onClose={handleOff}
            setEditingMode={setEditingMode}
            code={userProfile.code}
            setAnswer={setAnswerValue}
          />
        </Modal>
      </div>
    </>
  );
};

export default UserWikiPage;
